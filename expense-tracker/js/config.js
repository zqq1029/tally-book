/**
 * Config module — manages categories, payment methods, and keyword mappings.
 * Persisted in localStorage under key "expense-tracker-config".
 */
var Config = (function () {
  'use strict';

  var STORAGE_KEY = 'expense-tracker-config';

  // ── Preset data ──────────────────────────────────────────────

  var PRESET_CATEGORIES = [
    { name: '餐饮', icon: '🍜' },
    { name: '交通', icon: '🚗' },
    { name: '购物', icon: '🛒' },
    { name: '娱乐', icon: '🎬' },
    { name: '日用', icon: '🏠' },
    { name: '医疗', icon: '💊' },
    { name: '教育', icon: '📚' },
    { name: '其他', icon: '📌' }
  ];

  var PRESET_PAYMENT_METHODS = [
    { name: '支付宝', icon: '🅰️' },
    { name: '微信', icon: '🅱️' },
    { name: '现金', icon: '💵' },
    { name: '银行卡', icon: '💳' }
  ];

  // Keyword → category name mapping (used by voice parser)
  var PRESET_KEYWORD_MAP = {
    '餐饮': ['吃', '饭', '餐', '外卖', '奶茶', '咖啡', '早餐', '午餐', '晚餐', '夜宵', '火锅', '烧烤', '小吃', '水果', '零食', '饮料', '甜品', '面', '粥'],
    '交通': ['打车', '地铁', '公交', '加油', '停车', '高速', '过路', '滴滴', '出租', '火车', '高铁', '飞机', '机票', '骑车', '单车'],
    '购物': ['买', '购', '淘宝', '京东', '拼多多', '超市', '商场', '衣服', '鞋', '包', '数码', '电子'],
    '娱乐': ['电影', '游戏', 'KTV', '旅游', '门票', '演出', '健身', '运动', '会员', '视频', '音乐', '订阅'],
    '日用': ['水电', '燃气', '房租', '物业', '话费', '网费', '日用品', '洗衣', '理发', '清洁', '家政'],
    '医疗': ['医院', '看病', '挂号', '药', '体检', '牙', '眼科', '保健'],
    '教育': ['学费', '书', '课程', '培训', '考试', '报名', '教材', '文具'],
    '其他': []
  };

  // ── Internal state ───────────────────────────────────────────

  var state;

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function buildDefaultState() {
    return {
      categories: clone(PRESET_CATEGORIES),
      paymentMethods: clone(PRESET_PAYMENT_METHODS),
      keywordMap: clone(PRESET_KEYWORD_MAP),
      customCategories: [],
      customPaymentMethods: []
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        // Ensure required keys exist (forward-compatible)
        if (!state.categories) state.categories = clone(PRESET_CATEGORIES);
        if (!state.paymentMethods) state.paymentMethods = clone(PRESET_PAYMENT_METHODS);
        if (!state.keywordMap) state.keywordMap = clone(PRESET_KEYWORD_MAP);
        if (!state.customCategories) state.customCategories = [];
        if (!state.customPaymentMethods) state.customPaymentMethods = [];
        return;
      }
    } catch (e) {
      // fall through to init
    }
    state = buildDefaultState();
    save();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Config: failed to save to localStorage', e);
    }
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Returns the full config state object (a shallow copy).
   */
  function getConfig() {
    return clone(state);
  }

  /**
   * Returns merged array: preset categories + custom categories.
   */
  function getAllCategories() {
    return state.categories.concat(state.customCategories);
  }

  /**
   * Returns merged array: preset payment methods + custom payment methods.
   */
  function getAllPaymentMethods() {
    return state.paymentMethods.concat(state.customPaymentMethods);
  }

  /**
   * Add a custom category. keywords is an optional array of strings.
   * Returns true on success, false if name already exists.
   */
  function addCustomCategory(name, icon, keywords) {
    var all = getAllCategories();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name === name) return false;
    }
    state.customCategories.push({ name: name, icon: icon || '📌' });
    if (keywords && keywords.length) {
      state.keywordMap[name] = keywords;
    }
    save();
    return true;
  }

  /**
   * Remove a custom category by name. Preset categories cannot be removed.
   * Returns true on success, false if not found or is preset.
   */
  function removeCustomCategory(name) {
    for (var i = 0; i < state.customCategories.length; i++) {
      if (state.customCategories[i].name === name) {
        state.customCategories.splice(i, 1);
        delete state.keywordMap[name];
        save();
        return true;
      }
    }
    return false;
  }

  /**
   * Add a custom payment method. Returns true on success, false if name exists.
   */
  function addCustomPaymentMethod(name, icon) {
    var all = getAllPaymentMethods();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name === name) return false;
    }
    state.customPaymentMethods.push({ name: name, icon: icon || '💳' });
    save();
    return true;
  }

  /**
   * Remove a custom payment method by name. Preset methods cannot be removed.
   * Returns true on success, false if not found or is preset.
   */
  function removeCustomPaymentMethod(name) {
    for (var i = 0; i < state.customPaymentMethods.length; i++) {
      if (state.customPaymentMethods[i].name === name) {
        state.customPaymentMethods.splice(i, 1);
        save();
        return true;
      }
    }
    return false;
  }

  // ── Initialise ───────────────────────────────────────────────

  load();

  // ── Exports ──────────────────────────────────────────────────

  return {
    getConfig: getConfig,
    getAllCategories: getAllCategories,
    getAllPaymentMethods: getAllPaymentMethods,
    addCustomCategory: addCustomCategory,
    removeCustomCategory: removeCustomCategory,
    addCustomPaymentMethod: addCustomPaymentMethod,
    removeCustomPaymentMethod: removeCustomPaymentMethod
  };
})();
