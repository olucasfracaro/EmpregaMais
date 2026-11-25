function formatBrazilianPhone(value) {
  let digits = value.replace(/\D/g, "");

  if (digits.length > 11 && digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  const formattedLocal = local.length > 4
    ? `${local.slice(0, -4)}-${local.slice(-4)}`
    : local;

  return `(${ddd}) ${formattedLocal}`;
}

document.querySelectorAll('[data-mask="phone-br"]').forEach(input => {
  input.addEventListener("input", () => {
    const digitsBeforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length;
    input.value = formatBrazilianPhone(input.value);

    let caret = 0;
    let digitsPassed = 0;
    while (caret < input.value.length && digitsPassed < digitsBeforeCaret) {
      if (/\d/.test(input.value[caret])) digitsPassed++;
      caret++;
    }
    input.setSelectionRange(caret, caret);
  });

  input.value = formatBrazilianPhone(input.value);
});
