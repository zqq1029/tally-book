/**
 * VoiceParser — speech-to-text expense parsing engine.
 * Extracts amount, payment method, category, and note from natural language input.
 *
 * Test cases (expected results):
 *   VoiceParser.parse("花了25.5元买咖啡用支付宝")
 *     => { amount: 25.5, paymentMethod: "支付宝", category: "餐饮", note: "买咖啡" }
 *
 *   VoiceParser.parse("打车花了三十二块用微信支付")
 *     => { amount: 32, paymentMethod: "微信", category: "交通", note: "打车" }
 *
 *   VoiceParser.parse("买了两百五十元的衣服")
 *     => { amount: 250, paymentMethod: null, category: "购物", note: "买了衣服" }
 *
 *   VoiceParser.parse("午餐消费了50")
 *     => { amount: 50, paymentMethod: null, category: "餐饮", note: "午餐" }
 *
 *   VoiceParser.parse("交了一千二百块的房租用银行卡")
 *     => { amount: 1200, paymentMethod: "银行卡", category: "日用", note: "交了房租" }
 */
var VoiceParser = (function () {
  'use strict';

  // ── Chinese number conversion ─────────────────────────────────

  var CN_DIGITS = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9
  };

  var CN_UNITS = { '十': 10, '百': 100, '千': 1000 };

  /**
   * Convert Chinese number string to JavaScript number.
   * Supports: 零一二两三四五六七八九十百千点
   * Examples: "三十二" => 32, "两百五十" => 250, "一千二百" => 1200, "三点五" => 3.5
   */
  function _cnToNumber(str) {
    if (!str) return NaN;

    // Handle decimal point (点)
    var dotIdx = str.indexOf('点');
    if (dotIdx !== -1) {
      var intPart = _cnToNumber(str.substring(0, dotIdx));
      var fracStr = str.substring(dotIdx + 1);
      var frac = '';
      for (var i = 0; i < fracStr.length; i++) {
        var ch = fracStr[i];
        if (CN_DIGITS.hasOwnProperty(ch)) {
          frac += CN_DIGITS[ch];
        } else if (ch >= '0' && ch <= '9') {
          frac += ch;
        }
      }
      return parseFloat(intPart + '.' + (frac || '0'));
    }

    // If purely digits, parse directly
    if (/^\d+$/.test(str)) return parseInt(str, 10);

    // Special case: 十 alone = 10, 十X = 1X
    if (str.charAt(0) === '十' && str.length > 1) {
      return 10 + parseSubNumber(str.substring(1));
    }

    // Process using unit hierarchy: split by 千, 百, 十
    var result = 0;
    var current = 0;
    var i = 0;

    while (i < str.length) {
      var ch = str[i];

      if (CN_DIGITS.hasOwnProperty(ch)) {
        current = CN_DIGITS[ch];
        i++;
      } else if (CN_UNITS.hasOwnProperty(ch)) {
        var unit = CN_UNITS[ch];
        if (current === 0) current = 1; // implicit 1 before unit (e.g. 十二 => 1*10 + 2)
        result += current * unit;
        current = 0;
        i++;
      } else if (ch >= '0' && ch <= '9') {
        // mixed arabic digits
        var numStr = '';
        while (i < str.length && str[i] >= '0' && str[i] <= '9') {
          numStr += str[i];
          i++;
        }
        current = parseInt(numStr, 10);
      } else {
        i++;
      }
    }

    result += current;
    return result;
  }

  /** Parse sub-number (digits after a unit, e.g. the "二" in "十二") */
  function parseSubNumber(str) {
    var result = 0;
    var current = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (CN_DIGITS.hasOwnProperty(ch)) {
        current = CN_DIGITS[ch];
      } else if (CN_UNITS.hasOwnProperty(ch)) {
        if (current === 0) current = 1;
        result += current * CN_UNITS[ch];
        current = 0;
      }
    }
    result += current;
    return result;
  }

  // ── Amount extraction ─────────────────────────────────────────

  var ARABIC_PATTERNS = [
    /花了(\d+\.?\d*)/g,
    /消费了?(\d+\.?\d*)/g,
    /(\d+\.?\d*)元/g,
    /(\d+\.?\d*)块/g
  ];

  var CN_NUM_CLASS = '[零一二两三四五六七八九十百千点\\d]';
  var CN_PATTERNS = [
    new RegExp('花了?(' + CN_NUM_CLASS + '+)元?块?', 'g'),
    new RegExp('消费了?(' + CN_NUM_CLASS + '+)元?块?', 'g')
  ];

  function extractAmount(text) {
    var best = null;
    var bestIndex = text.length;

    // Try Arabic patterns first
    for (var p = 0; p < ARABIC_PATTERNS.length; p++) {
      var re = new RegExp(ARABIC_PATTERNS[p].source, 'g');
      var m;
      while ((m = re.exec(text)) !== null) {
        if (m.index < bestIndex) {
          bestIndex = m.index;
          best = { value: parseFloat(m[1]), matched: m[0] };
        }
      }
    }

    // Try Chinese number patterns
    for (var q = 0; q < CN_PATTERNS.length; q++) {
      var re2 = new RegExp(CN_PATTERNS[q].source, 'g');
      var m2;
      while ((m2 = re2.exec(text)) !== null) {
        if (m2.index < bestIndex) {
          var val = _cnToNumber(m2[1]);
          if (!isNaN(val) && val > 0) {
            bestIndex = m2.index;
            best = { value: val, matched: m2[0] };
          }
        }
      }
    }

    return best;
  }

  // ── Payment method extraction ─────────────────────────────────

  function extractPaymentMethod(text) {
    var methods = Config.getAllPaymentMethods();
    for (var i = 0; i < methods.length; i++) {
      if (text.indexOf(methods[i].name) !== -1) {
        return methods[i].name;
      }
    }
    return null;
  }

  // ── Category extraction ───────────────────────────────────────

  function extractCategory(text) {
    var config = Config.getConfig();
    var keywordMap = config.keywordMap;
    var bestCategory = null;
    var bestKeywordLength = 0;

    for (var cat in keywordMap) {
      if (!keywordMap.hasOwnProperty(cat)) continue;
      var keywords = keywordMap[cat];
      for (var i = 0; i < keywords.length; i++) {
        var kw = keywords[i];
        if (text.indexOf(kw) !== -1 && kw.length > bestKeywordLength) {
          bestKeywordLength = kw.length;
          bestCategory = cat;
        }
      }
    }

    return bestCategory;
  }

  // ── Note extraction ───────────────────────────────────────────

  var FILLER_WORDS = ['的', '了', '啊', '吧', '嘛', '呢'];

  function extractNote(text, amountMatched, paymentMethod, category) {
    var note = text;

    // Remove amount matched text
    if (amountMatched) {
      note = note.replace(amountMatched, ' ');
    }

    // Remove payment method name
    if (paymentMethod) {
      note = note.replace(new RegExp(paymentMethod, 'g'), ' ');
    }

    // Remove matched category keyword
    if (category) {
      var config = Config.getConfig();
      var keywords = config.keywordMap[category] || [];
      for (var i = 0; i < keywords.length; i++) {
        note = note.replace(new RegExp(keywords[i], 'g'), ' ');
      }
    }

    // Remove filler words
    for (var j = 0; j < FILLER_WORDS.length; j++) {
      note = note.replace(new RegExp(FILLER_WORDS[j], 'g'), ' ');
    }

    // Remove extra whitespace and trim
    note = note.replace(/\s+/g, ' ').trim();
    // Remove standalone spaces between CJK chars
    note = note.replace(/\s/g, '');

    return note || null;
  }

  // ── Main parse method ─────────────────────────────────────────

  function parse(text) {
    if (!text || typeof text !== 'string') {
      return { amount: null, paymentMethod: null, category: null, note: null };
    }

    var amountInfo = extractAmount(text);
    var amount = amountInfo ? amountInfo.value : null;
    var amountMatched = amountInfo ? amountInfo.matched : null;

    var paymentMethod = extractPaymentMethod(text);
    var category = extractCategory(text);
    var note = extractNote(text, amountMatched, paymentMethod, category);

    return {
      amount: amount,
      paymentMethod: paymentMethod,
      category: category,
      note: note
    };
  }

  // ── Exports ───────────────────────────────────────────────────

  return {
    parse: parse,
    _cnToNumber: _cnToNumber
  };
})();
