package com.empregamais.api.config;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Callable;

import org.springframework.cache.support.AbstractValueAdaptingCache;

final class ExpiringCache extends AbstractValueAdaptingCache {

    private final String name;
    private final long ttlNanos;
    private final ConcurrentMap<Object, Entry> entries = new ConcurrentHashMap<>();

    ExpiringCache(String name, Duration ttl) {
        super(false);
        this.name = name;
        this.ttlNanos = ttl.toNanos();
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public Object getNativeCache() {
        return entries;
    }

    @Override
    protected Object lookup(Object key) {
        Entry entry = entries.get(key);
        if (entry == null) return null;
        if (System.nanoTime() >= entry.expiresAtNanos()) {
            entries.remove(key, entry);
            return null;
        }
        return entry.value();
    }

    @Override
    public void put(Object key, Object value) {
        entries.put(key, new Entry(toStoreValue(value), System.nanoTime() + ttlNanos));
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T get(Object key, Callable<T> valueLoader) {
        synchronized (entries) {
            T cached = (T) get(key, Object.class);
            if (cached != null) return cached;

            try {
                T loaded = valueLoader.call();
                put(key, loaded);
                return loaded;
            } catch (Exception error) {
                throw new ValueRetrievalException(key, valueLoader, error);
            }
        }
    }

    @Override
    public void evict(Object key) {
        entries.remove(key);
    }

    @Override
    public void clear() {
        entries.clear();
    }

    private record Entry(Object value, long expiresAtNanos) {}
}
