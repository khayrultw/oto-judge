/**
 * Converts a 1-indexed number to its corresponding uppercase letter.
 * e.g., 1 => 'A', 2 => 'B'
 * @param {number} num - The number to convert (1-26).
 * @returns {string} The corresponding letter, or an empty string if the number is out of range.
 */
export const numToChar = (num) => {
    if (num > 0 && num <= 26) {
      return String.fromCharCode(64 + num);
    }
    return '';
  };
  
  /**
   * Converts an uppercase letter to its corresponding 1-indexed number.
   * e.g., 'A' => 1, 'B' => 2
   * @param {string} char - The single uppercase letter to convert.
   * @returns {number} The corresponding number, or 0 if the character is invalid.
   */
  export const charToNum = (char) => {
    if (typeof char === 'string' && char.length === 1) {
      const charCode = char.toUpperCase().charCodeAt(0);
      if (charCode >= 65 && charCode <= 90) {
        return charCode - 64;
      }
    }
    return 0;
  };
  