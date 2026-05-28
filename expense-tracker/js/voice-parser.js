/**
 * VoiceParser — speech-to-text expense parsing engine.
 * Supports colloquial Chinese expressions with confidence scoring.
 *
 * Test cases:
 *   "买了个煎饼果子花了8块" => { amount:8, category:"餐饮", note:"煎饼果子", confidence:0.8 }
 *   "中午请同事吃饭花了300" => { amount:300, category:"餐饮", note:"请同事吃饭", confidence:0.9 }
 *   "交房租2500"            => { amount:2500, category:"住房", note:"交房租", confidence:0.85 }
 *   "打车花了32用微信"       => { amount:32, paymentMethod:"微信", category:"交通", note:"打车", confidence:0.95 }
 *   "买了两百五十块的衣服"   => { amount:250, category:"购物", note:"买衣服", confidence:0.85 }
 *   "星巴克拿铁38"          => { amount:38, category:"餐饮", note:"星巴克拿铁", confidence:0.7 }
 */
var VoiceParser = (function () {
  'use strict';

  // ── Chinese number conversion ─────────────────────────────────

  var CN_DIGITS = {
    '零': 0, '〇': 0, '一': 1, '壹': 1, '二': 2, '贰': 2, '两': 2,
    '三': 3, '叁': 3, '四': 4, '肆': 4, '五': 5, '伍': 5,
    '六': 6, '陆': 6, '七': 7, '柒': 7, '八': 8, '捌': 8,
    '九': 9, '玖': 9
  };

  var CN_UNITS = { '十': 10, '拾': 10, '百': 100, '佰': 100, '千': 1000, '仟': 1000 };

  function cnToNumber(str) {
    if (!str) return NaN;
    str = str.replace(/\s/g, '');

    // Pure digits
    if (/^\d+\.?\d*$/.test(str)) return parseFloat(str);

    // Handle decimal point (点 or .)
    var dotIdx = str.indexOf('点');
    if (dotIdx === -1) dotIdx = str.indexOf('.');
    if (dotIdx !== -1) {
      var intPart = cnToNumber(str.substring(0, dotIdx));
      var fracStr = str.substring(dotIdx + 1);
      var frac = '';
      for (var i = 0; i < fracStr.length; i++) {
        var ch = fracStr[i];
        if (CN_DIGITS.hasOwnProperty(ch)) frac += CN_DIGITS[ch];
        else if (ch >= '0' && ch <= '9') frac += ch;
      }
      return parseFloat(intPart + '.' + (frac || '0'));
    }

    // Special: 十X = 1X
    if (str.charAt(0) === '十' && str.length > 1) {
      return 10 + cnToNumber(str.substring(1));
    }

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
      } else if (ch >= '0' && ch <= '9') {
        var numStr = '';
        while (i < str.length && str[i] >= '0' && str[i] <= '9') {
          numStr += str[i]; i++;
        }
        current = parseInt(numStr, 10);
        i--; // compensate for loop increment
      }
    }
    result += current;
    return result;
  }

  // ── Amount extraction ─────────────────────────────────────────

  // Patterns ordered by specificity (most specific first)
  var AMOUNT_PATTERNS = [
    // "花了X块/元/块钱/r"
    { re: /花了\s*(\d+\.?\d*)\s*(?:块钱|块|元|r|元钱)/i, group: 1 },
    { re: /花了\s*([零一二两三四五六七八九十百千点\d]+)\s*(?:块钱|块|元|元钱)/, group: 1, isCN: true },
    // "X块/元/块钱的[content]"
    { re: /(\d+\.?\d*)\s*(?:块钱|块|元)\s*的/i, group: 1 },
    { re: /([零一二两三四五六七八九十百千点\d]+)\s*(?:块钱|块|元)\s*的/, group: 1, isCN: true },
    // "花了X" (no unit, just digits after 花了)
    { re: /花了\s*(\d+\.?\d*)/, group: 1 },
    { re: /花了\s*([零一二两三四五六七八九十百千点\d]+)/, group: 1, isCN: true },
    // "消费了X"
    { re: /消费了?\s*(\d+\.?\d*)/, group: 1 },
    // "X块钱/X元" (standalone)
    { re: /(\d+\.?\d*)\s*(?:块钱|块|元|r|元钱)/i, group: 1 },
    { re: /([零一二两三四五六七八九十百千点\d]+)\s*(?:块钱|块|元|元钱)/, group: 1, isCN: true },
    // Bare number at end of string (e.g. "星巴克拿铁38")
    { re: /(\d+\.?\d*)\s*$/, group: 1 },
    // Bare number followed by CJK (e.g. "38元")
    { re: /(\d+\.?\d*)(?=[^\d.])/g, group: 1 },
  ];

  function extractAmount(text) {
    for (var p = 0; p < AMOUNT_PATTERNS.length; p++) {
      var pat = AMOUNT_PATTERNS[p];
      var re = new RegExp(pat.re.source, pat.re.flags);
      var m = re.exec(text);
      if (m) {
        var raw = m[pat.group];
        var val = pat.isCN ? cnToNumber(raw) : parseFloat(raw);
        if (!isNaN(val) && val > 0 && val < 1000000) {
          return { value: val, matched: m[0] };
        }
      }
    }
    return null;
  }

  // ── Payment method extraction ─────────────────────────────────

  function extractPaymentMethod(text) {
    var methods = Config.getAllPaymentMethods();
    var best = null;
    var bestLen = 0;
    for (var i = 0; i < methods.length; i++) {
      var name = methods[i].name;
      if (text.indexOf(name) !== -1 && name.length > bestLen) {
        bestLen = name.length;
        best = name;
      }
    }
    return best;
  }

  // ── Category keyword map (extended) ───────────────────────────

  var CATEGORY_KEYWORDS = {
    '餐饮': [
      '吃', '饭', '餐', '午饭', '晚饭', '早饭', '早餐', '晚餐', '午餐',
      '外卖', '奶茶', '咖啡', '火锅', '烧烤', '面', '饺子', '包子',
      '煎饼', '果子', '快餐', '便当', '盒饭', '汉堡', '披萨', '寿司',
      '拉面', '米线', '麻辣烫', '酸辣粉', '炸鸡', '薯条', '蛋糕',
      '甜品', '冰淇淋', '饮料', '果汁', '茶', '可乐', '啤酒',
      '请客', '请.*吃饭', '聚餐', '宵夜', '夜宵', '下午茶',
      '肯德基', 'KFC', '麦当劳', '星巴克', '瑞幸', '必胜客',
      '海底捞', '西贝', '真功夫', '吉野家', '味千'
    ],
    '交通': [
      '打车', '出租', '滴滴', 'uber', '地铁', '公交', '高铁',
      '火车', '飞机', '机票', '加油', '停车', '过路费', '高速',
      '骑车', '单车', '共享', '摩的', '轮渡', '船票',
      '汽油', '柴油', '充电', '充电桩', 'ETC'
    ],
    '购物': [
      '买', '购', '淘宝', '京东', '拼多多', '天猫', '苏宁',
      '衣服', '鞋', '包', '裤', '帽', '袜', '内衣',
      '手机', '电脑', '平板', '耳机', '充电器', '数据线',
      '化妆品', '护肤品', '口红', '面膜', '香水',
      '超市', '便利店', '商场', '百货'
    ],
    '娱乐': [
      '电影', 'ktv', '游戏', '门票', '景点', '旅游', '酒店',
      '住宿', '民宿', '机票', '火车票', '演出', '演唱会',
      '话剧', '音乐会', '展览', '博物馆', '动物园', '游乐园',
      '网吧', '台球', '保龄球', '健身房', '瑜伽', '游泳'
    ],
    '住房': [
      '房租', '租金', '物业', '水费', '电费', '燃气', '暖气',
      '宽带', '网费', '维修', '装修', '家具', '家电',
      '房贷', '按揭', '贷款'
    ],
    '日用': [
      '日用品', '纸巾', '洗衣液', '牙膏', '洗发水', '垃圾袋',
      '保鲜膜', '垃圾袋', '清洁', '消毒', '洗手液',
      '文具', '笔', '本子', '打印', '复印'
    ],
    '医疗': [
      '药', '医院', '看病', '体检', '挂号', '药店', '门诊',
      '牙科', '眼科', '皮肤科', '感冒', '发烧', '咳嗽',
      '保健', '维生素', '钙片', '口罩', '创可贴'
    ],
    '教育': [
      '书', '课程', '学费', '培训班', '教材', '考试', '报名',
      '网课', '辅导', '家教', '补习', '兴趣班'
    ],
    '烟酒': [
      '烟', '酒', '香烟', '烟草', '啤酒', '白酒', '红酒',
      '洋酒', '威士忌', '伏特加', '烟花', '爆竹', '鞭炮'
    ],
    '通讯': [
      '话费', '流量', '充值', '手机费', '电话费', '宽带费'
    ],
    '社交': [
      '红包', '份子钱', '礼物', '送礼', '随礼', '人情',
      '请客', '招待', '应酬'
    ],
    '宠物': [
      '猫粮', '狗粮', '宠物', '猫砂', '猫', '狗', '鸟',
      '鱼', '仓鼠', '兔子', '兽医', '宠物医院'
    ]
  };

  function extractCategory(text) {
    // First try config keywords
    var config = Config.getConfig();
    var keywordMap = config.keywordMap || {};
    var bestCategory = null;
    var bestScore = 0;

    // Check config keywords
    for (var cat in keywordMap) {
      if (!keywordMap.hasOwnProperty(cat)) continue;
      var keywords = keywordMap[cat];
      for (var i = 0; i < keywords.length; i++) {
        var kw = keywords[i];
        if (text.indexOf(kw) !== -1 && kw.length > bestScore) {
          bestScore = kw.length;
          bestCategory = cat;
        }
      }
    }

    // Check extended keywords (only if config didn't match well)
    if (bestScore < 2) {
      for (var cat2 in CATEGORY_KEYWORDS) {
        if (!CATEGORY_KEYWORDS.hasOwnProperty(cat2)) continue;
        var kws = CATEGORY_KEYWORDS[cat2];
        for (var j = 0; j < kws.length; j++) {
          var kw2 = kws[j];
          // Support regex-like patterns (e.g. "请.*吃饭")
          if (kw2.indexOf('.*') !== -1) {
            try {
              if (new RegExp(kw2).test(text) && kw2.length > bestScore) {
                bestScore = kw2.length;
                bestCategory = cat2;
              }
            } catch (e) {}
          } else if (text.indexOf(kw2) !== -1 && kw2.length > bestScore) {
            bestScore = kw2.length;
            bestCategory = cat2;
          }
        }
      }
    }

    return bestCategory;
  }

  // ── Candidate categories (when confidence is low) ─────────────

  function getCandidateCategories(text) {
    var candidates = [];
    var allCats = Config.getAllCategories();
    for (var i = 0; i < allCats.length; i++) {
      var cat = allCats[i];
      var keywords = CATEGORY_KEYWORDS[cat.name] || [];
      for (var j = 0; j < keywords.length; j++) {
        var kw = keywords[j];
        if (kw.indexOf('.*') !== -1) {
          try { if (new RegExp(kw).test(text)) { candidates.push(cat.name); break; } } catch (e) {}
        } else if (text.indexOf(kw) !== -1) {
          candidates.push(cat.name);
          break;
        }
      }
    }
    return candidates;
  }

  // ── Note extraction ───────────────────────────────────────────

  var FILLER_WORDS = ['的', '了', '啊', '吧', '嘛', '呢', '吧', '呀', '哦', '嗯'];

  // Action verbs to keep in note
  var ACTION_VERBS = ['买', '吃', '喝', '交', '付', '充', '订', '购', '打', '坐', '开', '租', '请', '送'];

  function extractNote(text, amountInfo, paymentMethod, category) {
    var note = text;

    // Remove amount matched text
    if (amountInfo && amountInfo.matched) {
      note = note.replace(amountInfo.matched, ' ');
    }

    // Remove payment method name
    if (paymentMethod) {
      note = note.replace(new RegExp(paymentMethod, 'g'), ' ');
    }

    // Remove matched category keywords (keep action verbs before them)
    if (category) {
      var allKeywords = (CATEGORY_KEYWORDS[category] || []).concat(
        (Config.getConfig().keywordMap || {})[category] || []
      );
      for (var i = 0; i < allKeywords.length; i++) {
        var kw = allKeywords[i];
        if (kw.indexOf('.*') !== -1) {
          try { note = note.replace(new RegExp(kw, 'g'), ' '); } catch (e) {}
        } else {
          note = note.replace(new RegExp(kw, 'g'), ' ');
        }
      }
    }

    // Remove filler words
    for (var j = 0; j < FILLER_WORDS.length; j++) {
      note = note.replace(new RegExp(FILLER_WORDS[j], 'g'), ' ');
    }

    // Remove standalone numbers that look like amounts
    note = note.replace(/\b\d+\.?\d*\b/g, ' ');

    // Clean up: remove extra spaces, trim
    note = note.replace(/\s+/g, ' ').trim();
    // Remove spaces between CJK characters
    note = note.replace(/([一-鿿])\s+([一-鿿])/g, '$1$2');
    note = note.replace(/\s/g, '');
    // Remove leading/trailing punctuation
    note = note.replace(/^[，,。.、;；]+/, '').replace(/[，,。.、;；]+$/, '');

    return note || null;
  }

  // ── Confidence calculation ────────────────────────────────────

  function calculateConfidence(amount, category, paymentMethod, note, text) {
    var score = 0;
    var maxScore = 0;

    // Amount: most important
    maxScore += 40;
    if (amount && amount > 0) {
      score += 40;
    }

    // Category match
    maxScore += 30;
    if (category) {
      score += 30;
    }

    // Payment method
    maxScore += 15;
    if (paymentMethod) {
      score += 15;
    }

    // Note quality (non-empty and meaningful)
    maxScore += 15;
    if (note && note.length >= 2) {
      score += 15;
    } else if (note && note.length === 1) {
      score += 5;
    }

    return Math.round((score / maxScore) * 100) / 100;
  }

  // ── Main parse method ─────────────────────────────────────────

  function parse(text) {
    if (!text || typeof text !== 'string') {
      return { amount: null, paymentMethod: null, category: null, note: null, confidence: 0, candidates: [] };
    }

    text = text.trim();

    var amountInfo = extractAmount(text);
    var amount = amountInfo ? amountInfo.value : null;
    var paymentMethod = extractPaymentMethod(text);
    var category = extractCategory(text);
    var note = extractNote(text, amountInfo, paymentMethod, category);
    var confidence = calculateConfidence(amount, category, paymentMethod, note, text);

    // If no category matched, provide candidates
    var candidates = [];
    if (!category) {
      candidates = getCandidateCategories(text);
    }

    return {
      amount: amount,
      paymentMethod: paymentMethod,
      category: category,
      note: note,
      confidence: confidence,
      candidates: candidates
    };
  }

  // ── Exports ───────────────────────────────────────────────────

  return {
    parse: parse,
    cnToNumber: cnToNumber,
    getCandidateCategories: getCandidateCategories
  };
})();
