// ============================================================================
// Friends Chicken pokodi / Riyan Fast Foods — Master Application Script
// Streamlined Daily Stock, Flexible KG/Grams Inputs & Cash Reconciliation System
// ============================================================================

(function () {
  'use strict';

  // --- Supabase Configuration & Client ---
  const cfg = window.SUPABASE_CONFIG || {};
  let db = null;
  const isSupabaseConfigured = Boolean(
    window.supabase &&
    cfg.url &&
    !cfg.url.startsWith("YOUR_") &&
    cfg.anonKey &&
    !cfg.anonKey.startsWith("YOUR_")
  );

  if (isSupabaseConfigured) {
    try {
      db = supabase.createClient(cfg.url, cfg.anonKey);
    } catch (err) {
      console.warn("Supabase init error, fallback to local storage:", err);
      db = null;
    }
  }

  // --- Master Menu Items ---
  const DEFAULT_MENU_ITEMS = [
    {
      id: "item-chicken-pokodi",
      name: "Chicken Pakora",
      category: "Chicken",
      unit: "kg",
      price: 480, // Standard rate per kg (100g = ₹60, 250g = ₹120, 1kg = ₹480)
      price_note: "100g: ₹60 | 250g: ₹120 | 1kg: ₹480",
      is_active: true,
      sort_order: 1
    },
    {
      id: "item-chicken-liver",
      name: "Chicken Liver Pakora",
      category: "Chicken",
      unit: "kg",
      price: 400, // Standard rate per kg (100g = ₹50, 250g = ₹100)
      price_note: "100g: ₹50 | 250g: ₹100",
      is_active: true,
      sort_order: 2
    },
    {
      id: "item-chicken-wings",
      name: "Chicken Wings",
      category: "Chicken",
      unit: "pieces",
      price: 20, // Rate per piece
      price_note: "₹20 / piece",
      is_active: true,
      sort_order: 3
    },
    {
      id: "item-chicken-full-joint",
      name: "Chicken Full Joint (Leg Piece)",
      category: "Chicken",
      unit: "pieces",
      price: 100, // Rate per piece
      price_note: "₹100 / piece",
      is_active: true,
      sort_order: 4
    },
    {
      id: "item-chicken-half-joint",
      name: "Chicken Half Joint",
      category: "Chicken",
      unit: "pieces",
      price: 50, // Rate per piece
      price_note: "₹50 / piece",
      is_active: true,
      sort_order: 5
    },
    {
      id: "item-fish-fry",
      name: "Fish Fry",
      category: "Fish",
      unit: "pieces",
      price: 40, // Rate per piece
      price_note: "₹40 / piece",
      is_active: true,
      sort_order: 6
    },
    {
      id: "item-fish-head",
      name: "Fish Head (Talakaya)",
      category: "Fish",
      unit: "pieces",
      price: 70, // Rate per piece
      price_note: "₹70 / piece",
      is_active: true,
      sort_order: 7
    },
    {
      id: "item-chilli-chicken",
      name: "Chilli Chicken",
      category: "Chicken",
      unit: "plates",
      price: 120, // Rate per plate
      price_note: "₹120 / plate",
      is_active: true,
      sort_order: 8
    },
    {
      id: "item-chicken-manchuria",
      name: "Chicken Manchuria",
      category: "Chicken",
      unit: "plates",
      price: 80, // Rate per plate
      price_note: "₹80 / plate",
      is_active: true,
      sort_order: 9
    },
    {
      id: "item-veg-manchuria-plate",
      name: "Veg Manchuria (Plate)",
      category: "Veg/FastFood",
      unit: "plates",
      price: 60,
      price_note: "₹60 / plate",
      is_active: true,
      sort_order: 10
    },
    {
      id: "item-veg-manchuria-fry",
      name: "Veg Manchuria (Fry)",
      category: "Veg/FastFood",
      unit: "plates",
      price: 70,
      price_note: "₹70 / plate",
      is_active: true,
      sort_order: 11
    },
    {
      id: "item-eggs-stock",
      name: "Eggs (All Egg Items / Omelettes / Boiled)",
      category: "Egg",
      unit: "eggs",
      price: 20, // Rate per egg (Single Omelette ₹20, Double ₹40, Boiled ₹20)
      price_note: "₹20 / egg (1 egg = ₹20, 2 eggs = ₹40)",
      is_active: true,
      sort_order: 12
    }
  ];

  const EXPENSE_CATEGORIES = [
    "Raw Chicken Meat",
    "Fish & Seafood",
    "Eggs Crate",
    "Cooking Oil",
    "Corn Flour & Maida",
    "Spices & Masala Groceries",
    "Dileep Master Wage / Daily Bata",
    "Commercial Gas Cylinder",
    "Packaging Covers & Bags",
    "Transport & Ice Blocks",
    "Electricity / Stall Maintenance",
    "Other Miscellaneous"
  ];

  // --- Hardcoded Secure Auth Credentials ---
  const AUTH_CREDENTIALS = {
    phone: "7702431524",
    pass: "Khamar7890?"
  };

  // --- Helper Functions ---
  const getTodayDate = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const getPreviousDate = (baseDateStr) => {
    const d = new Date((baseDateStr || getTodayDate()) + "T00:00:00");
    d.setDate(d.getDate() - 1);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const getNextDate = (baseDateStr) => {
    const d = new Date((baseDateStr || getTodayDate()) + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const formatCurrency = (n) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(+n || 0);
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return "";
    const date = new Date(dStr + "T00:00:00");
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const esc = (x) =>
    String(x ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  function normalizeToBase(val, unit, baseUnit) {
    const num = +val || 0;
    if (baseUnit === "kg" || baseUnit === "grams") {
      if (unit === "g" || unit === "grams") {
        return num / 1000;
      }
      return num; // in kg
    }
    if (baseUnit === "eggs" || baseUnit === "pieces") {
      if (unit === "crates" || unit === "crate") {
        return num * 30; // 1 crate = 30 eggs
      }
      return num;
    }
    return num; // in pieces or plates
  }

  // Robust Stock Line Normalizer & Legacy Cache Sanitizer
  function sanitizeStockLine(line, menuItem) {
    let itemId = (line && line.item_id) || (menuItem && menuItem.id) || "item-" + Date.now();
    let itemName = (line && line.item_name) || (menuItem && menuItem.name) || "Item";
    let rawUnit = (line && (line.item_unit || line.unit)) || (menuItem && menuItem.unit) || "kg";
    let unitPrice = line && line.unit_price !== undefined ? +line.unit_price : ((menuItem && +menuItem.price) || 0);
    let priceNote = (line && line.price_note) || (menuItem && menuItem.price_note) || "";
    let category = (line && line.category) || (menuItem && menuItem.category);

    if (!category) {
      if (itemId.startsWith("item-chicken-") || itemId.startsWith("item-chilli-")) {
        category = "Chicken";
      } else if (itemId.startsWith("item-fish-")) {
        category = "Fish";
      } else if (itemId.startsWith("item-veg-")) {
        category = "Veg/FastFood";
      } else if (itemId.startsWith("item-egg") || itemId.startsWith("item-omelette-") || itemId === "item-boiled-egg") {
        category = "Egg";
      } else {
        category = "Chicken";
      }
    }

    // Migrate legacy egg items to unified Eggs item
    if (itemId.startsWith("item-omelette-") || itemId === "item-boiled-egg" || itemId.startsWith("item-egg-")) {
      itemId = "item-eggs-stock";
      itemName = "Eggs (All Egg Items / Omelettes / Boiled)";
      rawUnit = "eggs";
      unitPrice = 20;
      priceNote = "₹20 / egg (1 egg = ₹20, 2 eggs = ₹40)";
      category = "Egg";
    }

    const isWeight = rawUnit === "kg" || rawUnit === "grams" || rawUnit === "g";
    const isEggs = rawUnit === "eggs" || itemId === "item-eggs-stock";
    const baseUnit = isWeight ? "kg" : (isEggs ? "eggs" : rawUnit);

    const openingVal = line && line.opening_val !== undefined ? line.opening_val : (line ? (line.opening_stock ?? 0) : 0);
    const addedVal = line && line.added_val !== undefined ? line.added_val : (line ? (line.marinated_added_stock ?? 0) : 0);
    const closingVal = line && line.closing_val !== undefined ? line.closing_val : (line ? (line.closing_stock ?? 0) : 0);

    const openUnit = (line && line.opening_unit) || (isWeight ? "kg" : (isEggs ? "eggs" : baseUnit));
    const addedUnit = (line && line.added_unit) || (isWeight ? "kg" : (isEggs ? "eggs" : baseUnit));
    const closeUnit = (line && line.closing_unit) || (isWeight ? "kg" : (isEggs ? "eggs" : baseUnit));

    const openNorm = normalizeToBase(openingVal, openUnit, baseUnit);
    const addedNorm = normalizeToBase(addedVal, addedUnit, baseUnit);
    const closeNorm = normalizeToBase(closingVal, closeUnit, baseUnit);
    const soldNorm = Math.max(0, Math.round((openNorm + addedNorm - closeNorm) * 1000) / 1000);
    const totalSales = Math.round(soldNorm * unitPrice);

    return {
      item_id: itemId,
      item_name: itemName,
      item_unit: baseUnit,
      category: category,
      unit_price: unitPrice,
      price_note: priceNote,
      
      opening_val: openingVal,
      opening_unit: openUnit,
      added_val: addedVal,
      added_unit: addedUnit,
      closing_val: closingVal,
      closing_unit: closeUnit,

      // Multi-batch tracking (KG items only — Dileep's WhatsApp photo weights)
      batches: (line && Array.isArray(line.batches) ? line.batches : []),

      opening_stock: openNorm,
      marinated_added_stock: addedNorm,
      closing_stock: closeNorm,
      sold_quantity: soldNorm,
      total_sales: totalSales,
      notes: (line && line.notes) || ""
    };
  }

  // --- Toast Notifications ---
  function showToast(msg) {
    const toastEl = document.querySelector("#toast");
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = "block";
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toastEl.style.display = "none";
    }, 2500);
  }

  // --- Local Storage Helpers ---
  function loadLocal(key, defaultVal) {
    try {
      const data = localStorage.getItem("fcp_" + key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function saveLocal(key, val) {
    try {
      localStorage.setItem("fcp_" + key, JSON.stringify(val));
    } catch (e) {
      console.error("Local storage save error", e);
    }
  }

  const authSession = loadLocal("auth_session", null);

  // --- Application State ---
  const S = {
    isAuthenticated: !!(authSession && authSession.is_authenticated),
    page: location.hash.slice(1) || "dashboard",
    today: getTodayDate(),
    selectedDate: getTodayDate(),
    menu: [],
    closings: {},       // Keyed by "YYYY-MM-DD"
    dailyStock: {},     // Keyed by "YYYY-MM-DD" -> array of stock lines
    expenses: [],       // List of expense objects
    shopName: "Friends Chicken Pakora / Riyan Fast Foods",
    masterDailyWage: 600,
    activeMenuCategory: "all",
    activeExpenseCategory: "all",
    reportRange: "today",
    loading: true
  };

  // --- Data Initialization & Supabase Sync ---
  async function initData() {
    S.loading = true;
    render();

    // 1. Load Local State
    S.menu = loadLocal("menu_v2", DEFAULT_MENU_ITEMS);
    S.closings = loadLocal("closings", {});
    S.dailyStock = loadLocal("dailyStock", {});
    S.expenses = loadLocal("expenses", []);
    S.shopName = loadLocal("shopName", S.shopName);
    S.masterDailyWage = loadLocal("masterDailyWage", S.masterDailyWage);

    // 2. Sync with Supabase if configured
    if (db) {
      try {
        const [menuRes, closingsRes, stockRes, expRes] = await Promise.all([
          db.from("menu_items").select("*").order("sort_order", { ascending: true }),
          db.from("daily_closings").select("*").order("closing_date", { ascending: false }),
          db.from("daily_stock_entries").select("*"),
          db.from("expenses").select("*").order("expense_date", { ascending: false })
        ]);

        if (menuRes.data && menuRes.data.length > 0) {
          S.menu = menuRes.data;
          saveLocal("menu_v2", S.menu);
        } else if (menuRes.data && menuRes.data.length === 0) {
          await db.from("menu_items").insert(DEFAULT_MENU_ITEMS);
        }

        if (closingsRes.data) {
          const map = {};
          closingsRes.data.forEach((c) => { map[c.closing_date] = c; });
          S.closings = map;
          saveLocal("closings", S.closings);
        }

        if (stockRes.data) {
          const stockMap = {};
          stockRes.data.forEach((st) => {
            if (!stockMap[st.entry_date]) stockMap[st.entry_date] = [];
            stockMap[st.entry_date].push(st);
          });
          S.dailyStock = stockMap;
          saveLocal("dailyStock", S.dailyStock);
        }

        if (expRes.data) {
          S.expenses = expRes.data;
          saveLocal("expenses", S.expenses);
        }
      } catch (err) {
        console.warn("Supabase sync failed, continuing in Local Storage mode:", err);
      }
    }

    // Auto-migrate legacy egg items in S.menu
    if (Array.isArray(S.menu)) {
      const hasLegacy = S.menu.some(m => m && m.id && (m.id.startsWith("item-omelette-") || m.id === "item-boiled-egg" || (m.id.startsWith("item-egg-") && m.id !== "item-eggs-stock")));
      if (hasLegacy) {
        S.menu = S.menu.filter(m => !m.id.startsWith("item-omelette-") && m.id !== "item-boiled-egg" && !(m.id.startsWith("item-egg-") && m.id !== "item-eggs-stock"));
        if (!S.menu.some(m => m.id === "item-eggs-stock")) {
          S.menu.push({
            id: "item-eggs-stock",
            name: "Eggs (All Egg Items / Omelettes / Boiled)",
            category: "Egg",
            unit: "eggs",
            price: 20,
            price_note: "₹20 / egg (1 egg = ₹20, 2 eggs = ₹40)",
            is_active: true,
            sort_order: 12
          });
        }
        saveLocal("menu_v2", S.menu);
      }
    }

    // Auto-migrate legacy egg items in S.dailyStock
    if (S.dailyStock && typeof S.dailyStock === "object") {
      Object.keys(S.dailyStock).forEach((d) => {
        if (Array.isArray(S.dailyStock[d])) {
          const hasOld = S.dailyStock[d].some(l => l && l.item_id && (l.item_id.startsWith("item-omelette-") || l.item_id === "item-boiled-egg" || (l.item_id.startsWith("item-egg-") && l.item_id !== "item-eggs-stock")));
          if (hasOld) {
            S.dailyStock[d] = S.dailyStock[d].filter(l => !l.item_id.startsWith("item-omelette-") && l.item_id !== "item-boiled-egg" && !(l.item_id.startsWith("item-egg-") && l.item_id !== "item-eggs-stock"));
            if (!S.dailyStock[d].some(l => l.item_id === "item-eggs-stock")) {
              S.dailyStock[d].push(sanitizeStockLine({
                item_id: "item-eggs-stock",
                item_name: "Eggs (All Egg Items / Omelettes / Boiled)",
                unit: "eggs",
                unit_price: 20,
                price_note: "₹20 / egg (1 egg = ₹20, 2 eggs = ₹40)",
                opening_val: 0,
                opening_unit: "eggs",
                added_val: 0,
                added_unit: "eggs",
                closing_val: 0,
                closing_unit: "eggs"
              }));
            }
          }
        }
      });
      saveLocal("dailyStock", S.dailyStock);
    }

    S.loading = false;
    render();
  }

  // --- Router ---
  function navigate(page) {
    location.hash = page;
  }
  window.addEventListener("hashchange", () => {
    S.page = location.hash.slice(1) || "dashboard";
    render();
    window.scrollTo(0, 0);
  });

  // --- Calculations & Stock Engine ---
  function getClosingForDate(dateStr) {
    return S.closings[dateStr] || {
      closing_date: dateStr,
      total_expected_sales: 0,
      actual_cash_collected: 0,
      actual_upi_collected: 0,
      total_revenue: 0,
      total_expenses: 0,
      net_profit: 0,
      cash_difference: 0,
      master_wage: S.masterDailyWage,
      notes: "",
      is_closed: false
    };
  }

  function syncClosingToNextDay(dateStr) {
    const nextDate = getNextDate(dateStr);
    const currLines = S.dailyStock[dateStr] || [];
    if (currLines.length === 0) return;

    const closingMap = {};
    const unitMap = {};
    currLines.forEach((l) => {
      const val = l.closing_val !== undefined && l.closing_val !== '' ? +l.closing_val : (+l.closing_stock || 0);
      closingMap[l.item_id] = val;
      unitMap[l.item_id] = l.closing_unit || l.item_unit || 'kg';
    });

    if (S.dailyStock[nextDate] && (!S.closings[nextDate] || !S.closings[nextDate].is_closed)) {
      S.dailyStock[nextDate].forEach((nl) => {
        if (closingMap[nl.item_id] !== undefined) {
          nl.opening_val = closingMap[nl.item_id];
          nl.opening_unit = unitMap[nl.item_id] || nl.item_unit;

          const itemUnitStr = (nl.item_unit || "kg").toLowerCase();
          const isWeight = itemUnitStr === "kg" || itemUnitStr === "grams" || itemUnitStr === "g";
          const isEggs = itemUnitStr === "eggs" || itemUnitStr === "egg" || nl.item_id === "item-eggs-stock";
          const baseUnit = isWeight ? "kg" : (isEggs ? "eggs" : itemUnitStr);

          const openNorm = normalizeToBase(nl.opening_val, nl.opening_unit || baseUnit, baseUnit);
          const addedNorm = normalizeToBase(nl.added_val, nl.added_unit || baseUnit, baseUnit);
          const closingNorm = normalizeToBase(nl.closing_val, nl.closing_unit || baseUnit, baseUnit);
          const soldNorm = Math.max(0, Math.round((openNorm + addedNorm - closingNorm) * 1000) / 1000);

          nl.sold_quantity = soldNorm;
          nl.opening_stock = openNorm;
          nl.marinated_added_stock = addedNorm;
          nl.closing_stock = closingNorm;
          nl.total_sales = Math.round(soldNorm * (+nl.unit_price || 0));
        }
      });
      saveLocal("dailyStock", S.dailyStock);
    }
  }

  function getStockLinesForDate(dateStr) {
    const menuMap = {};
    (S.menu || []).forEach((m) => { menuMap[m.id] = m; });

    // 1. Auto-carryover from previous day's closing stock!
    const prevDate = getPreviousDate(dateStr);
    const prevLines = S.dailyStock[prevDate] || [];
    const prevClosingMap = {};
    const prevUnitMap = {};
    prevLines.forEach((l) => {
      const val = l.closing_val !== undefined && l.closing_val !== '' ? +l.closing_val : (+l.closing_stock || 0);
      prevClosingMap[l.item_id] = val;
      prevUnitMap[l.item_id] = l.closing_unit || l.item_unit || 'kg';
    });

    const isCurrentLocked = S.closings[dateStr] && S.closings[dateStr].is_closed;

    if (S.dailyStock[dateStr] && S.dailyStock[dateStr].length > 0) {
      // Filter out legacy egg items and ensure item-eggs-stock exists
      let lines = S.dailyStock[dateStr].filter(l => l && !l.item_id.startsWith("item-omelette-") && l.item_id !== "item-boiled-egg" && !(l.item_id.startsWith("item-egg-") && l.item_id !== "item-eggs-stock"));
      if (!lines.some(l => l.item_id === "item-eggs-stock")) {
        lines.push({
          item_id: "item-eggs-stock",
          item_name: "Eggs (All Egg Items / Omelettes / Boiled)",
          unit: "eggs",
          unit_price: 20,
          price_note: "₹20 / egg (1 egg = ₹20, 2 eggs = ₹40)",
          opening_val: prevClosingMap["item-eggs-stock"] || 0,
          opening_unit: prevUnitMap["item-eggs-stock"] || "eggs",
          added_val: 0,
          added_unit: "eggs",
          closing_val: 0,
          closing_unit: "eggs"
        });
      }

      // If the current day is not locked, ensure opening stock dynamically matches previous day's closing stock!
      if (!isCurrentLocked && Object.keys(prevClosingMap).length > 0) {
        lines.forEach((l) => {
          if (prevClosingMap[l.item_id] !== undefined) {
            l.opening_val = prevClosingMap[l.item_id];
            if (prevUnitMap[l.item_id]) l.opening_unit = prevUnitMap[l.item_id];
          }
        });
      }

      S.dailyStock[dateStr] = lines.map((l) => sanitizeStockLine(l, menuMap[l.item_id]));
      saveLocal("dailyStock", S.dailyStock);
      return S.dailyStock[dateStr];
    }

    const activeItems = (S.menu || DEFAULT_MENU_ITEMS).filter((m) => m.is_active !== false);
    const generated = activeItems.map((item) => {
      const opening = prevClosingMap[item.id] || 0;
      const unit = prevUnitMap[item.id] || item.unit;
      return sanitizeStockLine({
        item_id: item.id,
        item_name: item.name,
        unit: item.unit,
        unit_price: item.price,
        price_note: item.price_note,
        opening_val: opening,
        opening_unit: unit,
        opening_stock: opening,
        added_val: 0,
        closing_val: 0
      }, item);
    });

    S.dailyStock[dateStr] = generated;
    saveLocal("dailyStock", S.dailyStock);
    return generated;
  }

  function computeDailyTotals(stockLines, cash, upi, expensesList, masterWage) {
    let expectedSales = 0;
    const lines = stockLines || [];
    lines.forEach((line) => {
      const isWeight = (line.item_unit === "kg" || line.item_unit === "grams" || !line.item_unit);
      const baseUnit = isWeight ? "kg" : line.item_unit;

      const openNorm = normalizeToBase(line.opening_val ?? line.opening_stock, line.opening_unit || baseUnit, baseUnit);
      const addedNorm = normalizeToBase(line.added_val ?? line.marinated_added_stock, line.added_unit || baseUnit, baseUnit);
      const closingNorm = normalizeToBase(line.closing_val ?? line.closing_stock, line.closing_unit || baseUnit, baseUnit);

      const soldNorm = Math.max(0, Math.round((openNorm + addedNorm - closingNorm) * 1000) / 1000);
      line.sold_quantity = soldNorm;
      line.opening_stock = openNorm;
      line.marinated_added_stock = addedNorm;
      line.closing_stock = closingNorm;

      // Sales = Sold in Base Unit * Unit Price
      const itemSales = soldNorm * (+line.unit_price || 0);
      line.total_sales = Math.round(itemSales);
      expectedSales += line.total_sales;
    });

    const actualCollected = (+cash || 0) + (+upi || 0);
    const cashDifference = actualCollected - expectedSales;

    let otherExpenses = 0;
    (expensesList || []).forEach((e) => {
      otherExpenses += +e.amount || 0;
    });

    const totalExpenses = otherExpenses + (+masterWage || 0);
    const netProfit = actualCollected - totalExpenses;

    return {
      expectedSales,
      actualCollected,
      cashDifference,
      totalExpenses,
      netProfit,
      stockLines: lines
    };
  }

  // --- Views Rendering ---

  // 1. Navigation Bar
  function renderNav() {
    const items = [
      ["dashboard", "🏠", "Home"],
      ["closing", "🌙", "Closing"],
      ["expenses", "🛒", "Expenses"],
      ["menu", "🍗", "Menu"],
      ["reports", "📊", "Reports"]
    ];

    return items
      .map(
        ([id, icon, label]) => `
      <button class="nav-item ${S.page === id ? "active" : ""}" onclick="window.fcp.go('${id}')">
        <div>${icon}</div>
        <span>${label}</span>
      </button>
    `
      )
      .join("");
  }

  // 2. Dashboard View
  function renderDashboard() {
    const today = S.today;
    const closing = getClosingForDate(today);
    const todayExpenses = (S.expenses || []).filter((e) => e.expense_date === today);
    const stockLines = getStockLinesForDate(today);

    const totals = computeDailyTotals(
      stockLines,
      closing.actual_cash_collected,
      closing.actual_upi_collected,
      todayExpenses,
      closing.master_wage
    );

    const isClosed = closing.is_closed;

    return `
      <div class="header-bar">
        <div>
          <div class="brand-title">🍗 Friends Chicken Pakora</div>
          <div class="brand-sub">Daily Tracker · ${formatDisplayDate(today)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="badge-status ${db ? "badge-online" : "badge-demo"}">
            ${db ? "● Online" : "● Offline"}
          </span>
          <button class="logout-btn" onclick="window.fcp.logout()" title="Logout">🚪 Logout</button>
        </div>
      </div>

      <!-- Quick Closing Callout -->
      <div class="closing-alert-card">
        <div>
          <h3>🌙 Night Closing</h3>
          <p>${isClosed ? "Tonight's closing is locked & settled" : "Reconcile daily stock & cash in 15 mins"}</p>
        </div>
        <button class="closing-btn" onclick="window.fcp.go('closing')">
          ${isClosed ? "View Sheet" : "Start Closing"}
        </button>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Today's Net Profit</div>
          <div class="kpi-amount ${totals.netProfit >= 0 ? "profit-pos" : "profit-neg"}">
            ${formatCurrency(totals.netProfit)}
          </div>
          <div class="kpi-sub">${totals.netProfit >= 0 ? "Profit (Surplus)" : "Loss (Deficit)"}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-amount revenue-color">
            ${formatCurrency(totals.actualCollected > 0 ? totals.actualCollected : totals.expectedSales)}
          </div>
          <div class="kpi-sub">Cash + UPI Received</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Today's Expenses</div>
          <div class="kpi-amount expense-color">
            ${formatCurrency(totals.totalExpenses)}
          </div>
          <div class="kpi-sub">Chicken + Groceries + Wage</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Cash Tally Match</div>
          <div class="kpi-amount ${totals.cashDifference === 0 ? "profit-pos" : totals.cashDifference < 0 ? "profit-neg" : "revenue-color"}">
            ${totals.cashDifference === 0 ? "₹0 Matched" : formatCurrency(totals.cashDifference)}
          </div>
          <div class="kpi-sub">${totals.cashDifference < 0 ? "Shortage" : totals.cashDifference > 0 ? "Excess Cash" : "Perfect Match"}</div>
        </div>
      </div>

      <!-- Action Buttons & Export Data -->
      <div class="action-row" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
        <button class="action-btn green" style="padding:10px 4px; font-size:12px;" onclick="window.fcp.openAddExpenseModal()">
          ➕ Add Expense
        </button>
        <button class="action-btn dark" style="padding:10px 4px; font-size:12px; background:#0284c7;" onclick="window.fcp.openExportModal()">
          📤 Export Data
        </button>
        <button class="action-btn dark" style="padding:10px 4px; font-size:12px;" onclick="window.fcp.go('menu')">
          🍗 Rates Menu
        </button>
      </div>


      <!-- Today's Master Stock Snapshot -->
      <div class="section">
        <div class="section-header">
          <h2>📊 Today's Stock Status</h2>
          <button class="link-btn" onclick="window.fcp.go('closing')">Full Closing Sheet →</button>
        </div>
        <div class="wizard-card" style="padding: 8px 12px;">
          ${stockLines.slice(0, 7).map(line => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 4px; border-bottom:1px solid #f1f5f9;">
              <div>
                <b style="font-size:14px; color:#0f172a;">${esc(line.item_name)}</b>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">
                  Open: <b>${line.opening_stock} ${line.item_unit || 'kg'}</b> · Added: <b>${line.marinated_added_stock} ${line.item_unit || 'kg'}</b>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:14px; font-weight:800; color:#16a34a;">Sold: ${line.sold_quantity} ${line.item_unit || 'kg'}</div>
                <div style="font-size:12px; color:#64748b;">Left: <b>${line.closing_stock} ${line.item_unit || 'kg'}</b></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Today's Expenses with ✏️ Edit Button -->
      <div class="section">
        <div class="section-header">
          <h2>🛒 Today's Purchases & Expenses</h2>
          <button class="link-btn" onclick="window.fcp.go('expenses')">View All →</button>
        </div>
        ${todayExpenses.length === 0 ? `
          <div class="empty-box">
            <span>🛒</span>
            No morning purchases or expenses logged today.<br>
            <button class="action-btn green" style="margin-top:12px; display:inline-flex;" onclick="window.fcp.openAddExpenseModal()">+ Add Morning Purchase</button>
          </div>
        ` : `
          <div class="tx-list">
            ${todayExpenses.map(e => `
              <div class="tx-card">
                <div class="tx-left">
                  <div class="tx-title">${esc(e.category)}</div>
                  <div class="tx-meta">${esc(e.description || e.quantity || "Purchase")} · ${esc(e.payment_method)}</div>
                </div>
                <div class="tx-right">
                  <div class="tx-amt expense-color">-${formatCurrency(e.amount)}</div>
                  <button class="tx-edit" onclick="window.fcp.openEditExpenseModal('${e.id}')" title="Edit expense">✏️ Edit</button>
                  <button class="tx-del" onclick="window.fcp.deleteExpense('${e.id}')" title="Delete expense">✕</button>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
  }

  // 3. 15-Minute Daily Night Closing Wizard View
  function renderClosingWizard() {
    const dateStr = S.selectedDate;
    const closing = getClosingForDate(dateStr);
    const todayExpenses = (S.expenses || []).filter((e) => e.expense_date === dateStr);
    const stockLines = getStockLinesForDate(dateStr);

    const totals = computeDailyTotals(
      stockLines,
      closing.actual_cash_collected,
      closing.actual_upi_collected,
      todayExpenses,
      closing.master_wage
    );

    return `
      <div class="header-bar">
        <div>
          <div class="brand-title">🌙 Night Closing Sheet</div>
          <div class="brand-sub">${formatDisplayDate(dateStr)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <input type="date" value="${dateStr}" id="closingDateInput" onchange="window.fcp.changeClosingDate(this.value)" class="date-picker-clean">
          <button class="action-btn dark" style="padding:6px 10px; font-size:11px; background:#0284c7; white-space:nowrap;" onclick="window.fcp.openExportModal('${dateStr}')">📤 Export</button>
        </div>
      </div>

      <div id="stockLinesContainer">
        ${(() => {
          const categoryDefs = [
            { key: "Chicken", title: "🍗 Chicken Items", subtitle: "Pakora batches, wings, joints & chilli dishes" },
            { key: "Egg", title: "🥚 Egg Items", subtitle: "Daily raw eggs tray count & omelette usage" },
            { key: "Veg/FastFood", title: "🥟 Veg & Manchuria", subtitle: "Fast food manchuria plates & fry" },
            { key: "Fish", title: "🐟 Fish Items", subtitle: "Fresh fish fry & fish head pieces" }
          ];

          return categoryDefs.map(cDef => {
            const catItems = stockLines
              .map((line, idx) => ({ line, idx }))
              .filter(({ line }) => {
                const cat = line.category || (line.item_id.startsWith("item-chicken-") || line.item_id.startsWith("item-chilli-") ? "Chicken" : (line.item_id.startsWith("item-fish-") ? "Fish" : (line.item_id.startsWith("item-veg-") ? "Veg/FastFood" : (line.item_id.startsWith("item-egg") ? "Egg" : "Chicken"))));
                return cat === cDef.key;
              });

            if (catItems.length === 0) return "";

            const isChickenCat = cDef.key === "Chicken";
            const wingsItem = stockLines.find((l) => l.item_id === "item-chicken-wings");
            const wingsIdx = stockLines.findIndex((l) => l.item_id === "item-chicken-wings");
            const fullJointItem = stockLines.find((l) => l.item_id === "item-chicken-full-joint");
            const fullJointIdx = stockLines.findIndex((l) => l.item_id === "item-chicken-full-joint");
            const halfJointItem = stockLines.find((l) => l.item_id === "item-chicken-half-joint");
            const halfJointIdx = stockLines.findIndex((l) => l.item_id === "item-chicken-half-joint");
            const liverItem = stockLines.find((l) => l.item_id === "item-chicken-liver");
            const liverIdx = stockLines.findIndex((l) => l.item_id === "item-chicken-liver");

            return `
              <div class="wizard-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #f1f5f9;">
                  <div>
                    <div style="font-size:15px; font-weight:800; color:#0f172a;">${cDef.title}</div>
                    <div style="font-size:11px; color:#64748b;">${cDef.subtitle}</div>
                  </div>
                  <span style="font-size:10px; font-weight:700; background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:999px;">
                    ${catItems.length} items
                  </span>
                </div>

                ${isChickenCat ? `
                  <!-- Enhanced Morning Raw Chicken Breakdown Card -->
                  <div class="intake-card">
                    <div class="intake-header">
                      <span class="intake-title">🍗 Morning Raw Chicken Breakdown</span>
                      <span class="intake-tag">Auto-Syncs With Stock</span>
                    </div>

                    <!-- Row 1: Total Raw Chicken & Pakora Chicken with KG / Grams Unit Selectors -->
                    <div class="intake-grid-2" style="margin-bottom: 8px;">
                      <div class="intake-field">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                          <label style="margin-bottom:0; font-size:11px; font-weight:700;">Total Raw Chicken</label>
                          <select class="field-unit-select" id="intake-total-unit"
                            onchange="window.fcp.updateChickenIntakeUnit('raw_chicken_intake_unit', this.value)">
                            <option value="kg" ${(closing.raw_chicken_intake_unit || 'kg') === 'kg' ? 'selected' : ''}>kg</option>
                            <option value="g" ${(closing.raw_chicken_intake_unit || 'kg') === 'g' || closing.raw_chicken_intake_unit === 'grams' ? 'selected' : ''}>grams</option>
                          </select>
                        </div>
                        <input type="number" step="any" min="0" id="intake-total-chicken"
                          value="${closing.raw_chicken_intake_val !== undefined && closing.raw_chicken_intake_val !== '' ? closing.raw_chicken_intake_val : (closing.raw_chicken_intake_kg || '')}"
                          placeholder="e.g. 12"
                          style="width:100%; border:1px solid #cbd5e1; border-radius:7px; padding:7px 8px; font-size:14px; font-weight:800; background:#fff;"
                          oninput="window.fcp.updateChickenIntakeVal('raw_chicken_intake_val', this.value)">
                      </div>

                      <div class="intake-field">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                          <label style="margin-bottom:0; font-size:11px; font-weight:700;">Pakora Chicken</label>
                          <select class="field-unit-select" id="intake-pakora-unit"
                            onchange="window.fcp.updateChickenIntakeUnit('raw_pakora_meat_unit', this.value)">
                            <option value="kg" ${(closing.raw_pakora_meat_unit || 'kg') === 'kg' ? 'selected' : ''}>kg</option>
                            <option value="g" ${(closing.raw_pakora_meat_unit || 'kg') === 'g' || closing.raw_pakora_meat_unit === 'grams' ? 'selected' : ''}>grams</option>
                          </select>
                        </div>
                        <input type="number" step="any" min="0" id="intake-pakora-meat-input"
                          value="${closing.raw_pakora_meat_val !== undefined && closing.raw_pakora_meat_val !== '' ? closing.raw_pakora_meat_val : (closing.raw_pakora_meat_kg || '')}"
                          placeholder="0"
                          style="width:100%; border:1.5px solid #fb923c; border-radius:7px; padding:7px 8px; font-size:14px; font-weight:800; background:#fff; color:#ea580c;"
                          oninput="window.fcp.updateChickenIntakeVal('raw_pakora_meat_val', this.value, true)">
                      </div>
                    </div>

                    <!-- Row 2: Cuts Pieces & Weight Grid -->
                    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
                      <!-- Wings: Pieces + Weight -->
                      <div class="cut-item" style="text-align:left; padding:6px 8px;">
                        <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:3px;">🍗 Wings</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                          <div>
                            <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                            <input type="number" step="1" min="0" value="${wingsItem?.added_val || closing.wings_pieces || ''}" placeholder="0"
                              id="intake-wings-pcs"
                              oninput="window.fcp.updateChickenIntakeCut('wings_pieces', this.value, ${wingsIdx})">
                          </div>
                          <div>
                            <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                            <input type="number" step="any" min="0" value="${closing.wings_weight || ''}" placeholder="0"
                              id="intake-wings-wt"
                              oninput="window.fcp.updateChickenIntakeCut('wings_weight', this.value)">
                          </div>
                        </div>
                      </div>

                      <!-- Full Joint: Pieces + Weight -->
                      <div class="cut-item" style="text-align:left; padding:6px 8px;">
                        <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:3px;">🍗 Full Joint</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                          <div>
                            <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                            <input type="number" step="1" min="0" value="${fullJointItem?.added_val || closing.full_joint_pieces || ''}" placeholder="0"
                              id="intake-full-joint-pcs"
                              oninput="window.fcp.updateChickenIntakeCut('full_joint_pieces', this.value, ${fullJointIdx})">
                          </div>
                          <div>
                            <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                            <input type="number" step="any" min="0" value="${closing.full_joint_weight || ''}" placeholder="0"
                              id="intake-full-joint-wt"
                              oninput="window.fcp.updateChickenIntakeCut('full_joint_weight', this.value)">
                          </div>
                        </div>
                      </div>

                      <!-- Half Joint: Pieces + Weight -->
                      <div class="cut-item" style="text-align:left; padding:6px 8px;">
                        <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:3px;">🍗 Half Joint</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                          <div>
                            <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                            <input type="number" step="1" min="0" value="${halfJointItem?.added_val || closing.half_joint_pieces || ''}" placeholder="0"
                              id="intake-half-joint-pcs"
                              oninput="window.fcp.updateChickenIntakeCut('half_joint_pieces', this.value, ${halfJointIdx})">
                          </div>
                          <div>
                            <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                            <input type="number" step="any" min="0" value="${closing.half_joint_weight || ''}" placeholder="0"
                              id="intake-half-joint-wt"
                              oninput="window.fcp.updateChickenIntakeCut('half_joint_weight', this.value)">
                          </div>
                        </div>
                      </div>

                      <!-- Liver: Weight -->
                      <div class="cut-item" style="text-align:left; padding:6px 8px;">
                        <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:3px;">🍗 Liver</div>
                        <div>
                          <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (grams)</span>
                          <input type="number" step="any" min="0" value="${liverItem?.added_val || closing.liver_val || ''}" placeholder="0"
                            id="intake-liver-wt"
                            oninput="window.fcp.updateChickenIntakeCut('liver_val', this.value, ${liverIdx})">
                        </div>
                      </div>
                    </div>
                  </div>
                ` : ''}

                <div class="stock-cat-items">
                  ${catItems.map(({ line, idx }) => {
                    const itemUnitStr = (line.item_unit || "kg").toLowerCase();
                    const isWeight = itemUnitStr === "kg" || itemUnitStr === "grams" || itemUnitStr === "g";
                    const isEggs = itemUnitStr === "eggs" || itemUnitStr === "egg" || line.item_id === "item-eggs-stock";
                    const openUnit = line.opening_unit || (isWeight ? "kg" : (isEggs ? "eggs" : itemUnitStr));
                    const addedUnit = line.added_unit || (isWeight ? "kg" : (isEggs ? "eggs" : itemUnitStr));
                    const closeUnit = line.closing_unit || (isWeight ? "kg" : (isEggs ? "eggs" : itemUnitStr));

                    const openVal = line.opening_val !== undefined ? line.opening_val : (line.opening_stock || 0);
                    const addedVal = line.added_val !== undefined ? line.added_val : (line.marinated_added_stock || 0);
                    const closeVal = line.closing_val !== undefined ? line.closing_val : (line.closing_stock || 0);

                    return `
                      <div class="stock-item-row" id="stock-row-${idx}" data-idx="${idx}" data-itemid="${line.item_id}">
                        <div class="stock-item-header">
                          <div style="display:flex; align-items:center; gap:8px;">
                            <span class="stock-item-name">${esc(line.item_name)}</span>
                            <span style="font-size:11px; font-weight:700; color:#64748b; background:#e2e8f0; padding:2px 6px; border-radius:4px;">${itemUnitStr.toUpperCase()}</span>
                          </div>
                          <div class="stock-item-price" style="font-size:12px; font-weight:700; color:#475569; background:#f8fafc; padding:3px 8px; border-radius:6px; border:1px solid #e2e8f0;">
                            ₹${line.unit_price} / ${isWeight ? 'kg' : itemUnitStr}
                          </div>
                        </div>

                        ${isWeight ? `
                          <!-- KG Items: Opening + Multi-Batch Panel + Leftover -->
                          <div class="stock-calc-grid">
                            <!-- Opening Stock Field -->
                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Opening</label>
                                <select class="field-unit-select" onchange="window.fcp.updateFieldUnit(${idx}, 'opening_unit', this.value)">
                                  <option value="kg" ${openUnit === 'kg' ? 'selected' : ''}>kg</option>
                                  <option value="g" ${openUnit === 'g' || openUnit === 'grams' ? 'selected' : ''}>grams</option>
                                </select>
                              </div>
                              <input type="number" step="any" min="0" value="${openVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'opening_val', this.value)">
                            </div>

                            <!-- Leftover Closing Field -->
                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Leftover</label>
                                <select class="field-unit-select" onchange="window.fcp.updateFieldUnit(${idx}, 'closing_unit', this.value)">
                                  <option value="kg" ${closeUnit === 'kg' ? 'selected' : ''}>kg</option>
                                  <option value="g" ${closeUnit === 'g' || closeUnit === 'grams' ? 'selected' : ''}>grams</option>
                                </select>
                              </div>
                              <input type="number" step="any" min="0" value="${closeVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'closing_val', this.value)">
                            </div>
                          </div>

                          <!-- Multi-Batch Ready Pakora Panel (KG items only) -->
                          <div class="batch-panel" id="batch-panel-${idx}">
                            <div class="batch-panel-header">
                              <div class="batch-panel-title">
                                📸 Dileep's Batches (WhatsApp photo weights)
                              </div>
                              <span class="batch-total-badge" id="batch-total-${idx}">
                                Total: ${line.added_val > 0 ? line.added_val + ' ' + (line.added_unit || 'kg') : '0 kg'}
                              </span>
                            </div>
                            <div id="batch-rows-${idx}">
                              ${(() => {
                                const batches = (line.batches && line.batches.length > 0)
                                  ? line.batches
                                  : (line.added_val > 0 ? [{ val: line.added_val, unit: line.added_unit || 'kg' }] : []);
                                if (batches.length === 0) {
                                  return `<div style="font-size:12px; color:#9ca3af; text-align:center; padding:8px 0; font-style:italic;">No batches yet — add each batch Dileep weighs 👇</div>`;
                                }
                                return batches.map((b, bi) => `
                                  <div class="batch-row" id="batch-row-${idx}-${bi}">
                                    <span class="batch-row-label">Batch ${bi + 1}</span>
                                    <input type="number" step="any" min="0" value="${b.val || ''}" placeholder="0"
                                      oninput="window.fcp.updateBatch(${idx}, ${bi}, 'val', this.value)">
                                    <select class="batch-unit-select" onchange="window.fcp.updateBatch(${idx}, ${bi}, 'unit', this.value)">
                                      <option value="g" ${(b.unit === 'g' || b.unit === 'grams') ? 'selected' : ''}>grams</option>
                                      <option value="kg" ${b.unit === 'kg' ? 'selected' : ''}>kg</option>
                                    </select>
                                    <button class="remove-batch-btn" onclick="window.fcp.removeBatch(${idx}, ${bi})" title="Remove batch">✕</button>
                                  </div>
                                `).join('');
                              })()}
                            </div>
                            <button class="add-batch-btn" onclick="window.fcp.addBatch(${idx})">
                              + Add Batch (from Dileep's photo)
                            </button>
                          </div>
                        ` : isEggs ? `
                          <!-- Eggs Stock: Opening + Added Today + Leftover with eggs/crates option -->
                          <div class="stock-calc-grid">
                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Opening</label>
                                <select class="field-unit-select" onchange="window.fcp.updateFieldUnit(${idx}, 'opening_unit', this.value)">
                                  <option value="eggs" ${openUnit === 'eggs' ? 'selected' : ''}>eggs</option>
                                  <option value="crates" ${openUnit === 'crates' || openUnit === 'crate' ? 'selected' : ''}>crates (30 eggs)</option>
                                </select>
                              </div>
                              <input type="number" step="any" min="0" value="${openVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'opening_val', this.value)">
                            </div>

                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Added Today</label>
                                <select class="field-unit-select" onchange="window.fcp.updateFieldUnit(${idx}, 'added_unit', this.value)">
                                  <option value="eggs" ${addedUnit === 'eggs' ? 'selected' : ''}>eggs</option>
                                  <option value="crates" ${addedUnit === 'crates' || addedUnit === 'crate' ? 'selected' : ''}>crates (30 eggs)</option>
                                </select>
                              </div>
                              <input type="number" step="any" min="0" value="${addedVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'added_val', this.value)">
                            </div>

                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Leftover</label>
                                <select class="field-unit-select" onchange="window.fcp.updateFieldUnit(${idx}, 'closing_unit', this.value)">
                                  <option value="eggs" ${closeUnit === 'eggs' ? 'selected' : ''}>eggs</option>
                                  <option value="crates" ${closeUnit === 'crates' || closeUnit === 'crate' ? 'selected' : ''}>crates (30 eggs)</option>
                                </select>
                              </div>
                              <input type="number" step="any" min="0" value="${closeVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'closing_val', this.value)">
                            </div>
                          </div>
                        ` : `
                          <!-- Pieces/Plates Items: Simple Opening / Added / Leftover -->
                          <div class="stock-calc-grid">
                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Opening</label>
                                <span style="font-size:11px; color:#64748b;">${itemUnitStr}</span>
                              </div>
                              <input type="number" step="any" min="0" value="${openVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'opening_val', this.value)">
                            </div>

                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Added Today</label>
                                <span style="font-size:11px; color:#64748b;">${itemUnitStr}</span>
                              </div>
                              <input type="number" step="any" min="0" value="${addedVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'added_val', this.value)">
                            </div>

                            <div class="calc-field">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <label style="margin-bottom:0;">Leftover</label>
                                <span style="font-size:11px; color:#64748b;">${itemUnitStr}</span>
                              </div>
                              <input type="number" step="any" min="0" value="${closeVal}" placeholder="0"
                                oninput="window.fcp.updateStockLineValue(${idx}, 'closing_val', this.value)">
                            </div>
                          </div>
                        `}

                        <div class="stock-result-row" style="margin-top:6px;">
                          <span class="stock-sold-badge" id="sold-badge-${idx}">
                            Sold: <b>${line.sold_quantity} ${itemUnitStr}</b> ${isWeight && line.sold_quantity > 0 ? `<span style="color:#64748b; font-size:11px;">(~${Math.round(line.sold_quantity * 1000)} g)</span>` : (isEggs && line.sold_quantity >= 30 ? `<span style="color:#64748b; font-size:11px;">(~${(Math.round((line.sold_quantity / 30) * 10) / 10)} crates)</span>` : '')}
                          </span>
                          <span class="stock-revenue-badge" id="sales-badge-${idx}">
                            Expected Sales: ${formatCurrency(line.total_sales)}
                          </span>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }).join("");
        })()}
      </div>

      <!-- Step 2: Cash & UPI Collections Tally -->
      <div class="wizard-card">
        <div class="wizard-step-header">
          <div class="step-number">2</div>
          <div>
            <div class="step-title">Cash & Online UPI Payments Tally</div>
            <div class="step-subtitle">Count cash drawer & online PhonePe/GooglePay QR collections</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label>💵 Cash in Hand (₹)</label>
            <input type="number" step="any" id="actualCashInput" value="${closing.actual_cash_collected || ""}" placeholder="0" 
              style="font-size:18px; font-weight:800;"
              oninput="window.fcp.updateClosingField('actual_cash_collected', this.value)">
          </div>

          <div class="form-group">
            <label>📱 Online UPI / QR (₹)</label>
            <input type="number" step="any" id="actualUpiInput" value="${closing.actual_upi_collected || ""}" placeholder="0" 
              style="font-size:18px; font-weight:800;"
              oninput="window.fcp.updateClosingField('actual_upi_collected', this.value)">
          </div>
        </div>

        <!-- Tally Comparison Indicator Box -->
        <div id="tally-box" class="tally-box ${totals.cashDifference === 0 ? "tally-matched" : totals.cashDifference < 0 ? "tally-shortage" : "tally-surplus"}">
          <div>
            <div class="tally-title">
              ${totals.cashDifference === 0 
                ? "🎉 Cash Tally Matched Perfectly!" 
                : totals.cashDifference < 0 
                ? "⚠️ Cash Shortage Detected" 
                : "ℹ️ Cash Surplus / Extra Collected"}
            </div>
            <div style="font-size:12px; margin-top:3px;">
              Expected from Stock: <b>${formatCurrency(totals.expectedSales)}</b> | Actual Collected: <b>${formatCurrency(totals.actualCollected)}</b>
            </div>
          </div>
          <div class="tally-amount">
            ${totals.cashDifference === 0 ? "₹0" : formatCurrency(totals.cashDifference)}
          </div>
        </div>
      </div>

      <!-- Step 3: Expenses & Master Dileep Wage -->
      <div class="wizard-card">
        <div class="wizard-step-header">
          <div class="step-number">3</div>
          <div>
            <div class="step-title">Expenses & Master Dileep Daily Wage</div>
            <div class="step-subtitle">Raw chicken meat, oil, groceries & master's daily bata</div>
          </div>
        </div>

        <div class="form-group">
          <label>👨‍🍳 Dileep Master Daily Wage / Bata (₹)</label>
          <input type="number" step="any" id="masterWageInput" value="${closing.master_wage ?? S.masterDailyWage}" 
            style="font-weight:800;"
            oninput="window.fcp.updateClosingField('master_wage', this.value)">
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-top:10px;">
          <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:8px;">
            <span>Purchases & Groceries Logged:</span>
            <span class="expense-color" id="closing-exp-total">${formatCurrency(totals.totalExpenses - (+closing.master_wage || 0))}</span>
          </div>
          ${todayExpenses.map(e => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#475569; padding:5px 0; border-bottom:1px dashed #e2e8f0;">
              <span>• ${esc(e.category)} (${esc(e.description || e.quantity || "Paid")})</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <b>${formatCurrency(e.amount)}</b>
                <button class="tx-edit" style="padding:2px 5px; font-size:11px;" onclick="window.fcp.openEditExpenseModal('${e.id}')" title="Edit expense">✏️</button>
                <button class="tx-del" style="padding:2px 5px; font-size:12px;" onclick="window.fcp.deleteExpense('${e.id}')" title="Delete expense">✕</button>
              </div>
            </div>
          `).join("")}
          <button class="action-btn light" style="width:100%; margin-top:8px; padding:8px; font-size:13px;" onclick="window.fcp.openAddExpenseModal()">
            ➕ Add Missed Expense
          </button>
        </div>
      </div>

      <!-- Step 4: Final Settlement & Lock -->
      <div class="wizard-card" style="background: linear-gradient(135deg, #0f172a, #1e293b); color:#fff; padding:20px;">
        <h3 style="font-size:18px; font-weight:800; margin-bottom:14px;">🏆 Daily Net Profit & Settlement</h3>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px;">
          <div>
            <div style="font-size:12px; color:#94a3b8;">Total Revenue Collected:</div>
            <div style="font-size:20px; font-weight:800; color:#4ade80;" id="closing-total-collected">${formatCurrency(totals.actualCollected)}</div>
          </div>
          <div>
            <div style="font-size:12px; color:#94a3b8;">Total Expenses + Wage:</div>
            <div style="font-size:20px; font-weight:800; color:#f87171;" id="closing-total-expenses">${formatCurrency(totals.totalExpenses)}</div>
          </div>
        </div>

        <div style="border-top:1px solid #334155; padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:13px; color:#cbd5e1;">Net Profit (Take Home):</div>
            <div style="font-size:28px; font-weight:800; color:${totals.netProfit >= 0 ? '#4ade80' : '#f87171'};" id="closing-net-profit">
              ${formatCurrency(totals.netProfit)}
            </div>
          </div>
          <button class="action-btn green" style="padding:14px 22px; font-size:15px;" onclick="window.fcp.saveAndLockClosing()">
            🔒 Lock & Save Closing
          </button>
        </div>

        <button class="action-btn dark" style="width:100%; margin-top:14px; padding:11px; font-size:13px; background:#0284c7; border:none;" 
          onclick="window.fcp.openExportModal('${dateStr}')">
          📤 Extract & Export This Day's Report (Excel / WhatsApp / Print)
        </button>
      </div>
    `;
  }

  // 4. Expenses Management View (with ✏️ Edit Pencil button)
  function renderExpenses() {
    const cat = S.activeExpenseCategory;
    let list = S.expenses || [];
    if (cat !== "all") {
      list = list.filter((e) => e.category === cat);
    }

    const totalExp = list.reduce((sum, e) => sum + +e.amount, 0);

    return `
      <div class="header-bar">
        <div>
          <div class="brand-title">🛒 Purchases & Expenses</div>
          <div class="brand-sub">Chicken, oil, eggs, masala groceries & stall costs</div>
        </div>
        <button class="action-btn green" style="padding:8px 14px; font-size:13px;" onclick="window.fcp.openAddExpenseModal()">
          ➕ New Purchase
        </button>
      </div>

      <div class="chips-scroll">
        <button class="chip ${cat === "all" ? "active" : ""}" onclick="window.fcp.filterExpenseCat('all')">All</button>
        ${EXPENSE_CATEGORIES.map(c => `
          <button class="chip ${cat === c ? "active" : ""}" onclick="window.fcp.filterExpenseCat('${c}')">${c}</button>
        `).join("")}
      </div>

      <div class="kpi-card" style="margin-bottom:14px;">
        <div class="kpi-label">Filtered Expenses Total</div>
        <div class="kpi-amount expense-color">${formatCurrency(totalExp)}</div>
        <div class="kpi-sub">${list.length} expense entries recorded</div>
      </div>

      ${list.length === 0 ? `
        <div class="empty-box">
          <span>🧾</span>
          No expenses recorded in this category.
        </div>
      ` : `
        <div class="tx-list">
          ${list.map(e => `
            <div class="tx-card">
              <div class="tx-left">
                <div class="tx-title">${esc(e.category)}</div>
                <div class="tx-meta">
                  📅 ${formatDisplayDate(e.expense_date)} · 
                  ${e.quantity ? `📦 ${esc(e.quantity)} · ` : ""}
                  💳 ${esc(e.payment_method)}
                  ${e.description ? ` · "${esc(e.description)}"` : ""}
                </div>
              </div>
              <div class="tx-right">
                <div class="tx-amt expense-color">-${formatCurrency(e.amount)}</div>
                <button class="tx-edit" onclick="window.fcp.openEditExpenseModal('${e.id}')" title="Edit expense">✏️ Edit</button>
                <button class="tx-del" onclick="window.fcp.deleteExpense('${e.id}')" title="Delete expense">✕</button>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    `;
  }

  // 5. Menu Items Management View
  function renderMenu() {
    const cat = S.activeMenuCategory;
    let list = S.menu || [];
    if (cat !== "all") {
      list = list.filter((m) => m.category === cat);
    }

    const categories = ["all", "Chicken", "Egg", "Fish", "Veg/FastFood"];

    return `
      <div class="header-bar">
        <div>
          <div class="brand-title">🍗 Master Menu & Selling Rates</div>
          <div class="brand-sub">Set your selling prices here — used in night closing calculations</div>
        </div>
        <button class="action-btn dark" style="padding:8px 14px; font-size:13px;" onclick="window.fcp.openAddItemModal()">
          ➕ Add New Item
        </button>
      </div>

      <div class="chips-scroll">
        ${categories.map(c => `
          <button class="chip ${cat === c ? "active" : ""}" onclick="window.fcp.filterMenuCat('${c}')">
            ${c === "all" ? "All Categories" : c}
          </button>
        `).join("")}
      </div>

      <div class="menu-grid">
        ${list.map(item => {
          const unit = (item.unit || "kg").toLowerCase();
          const isKg = unit === "kg" || unit === "grams";
          const isEggItem = unit === "eggs" || item.id === "item-eggs-stock";

          return `
          <div class="menu-item-card">
            <div class="menu-item-info">
              <h4>${esc(item.name)}</h4>
              <div style="display:inline-block; font-size:10px; font-weight:700; color:#64748b; background:#e2e8f0; padding:2px 7px; border-radius:4px; margin-top:3px; letter-spacing:0.5px;">
                ${item.category.toUpperCase()}
              </div>
              ${isKg && item.price_note ? `
                <!-- Portion price breakdown for KG items -->
                <div style="margin-top:8px;">
                  <div style="font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Selling Prices:</div>
                  <div style="display:flex; flex-wrap:wrap; gap:5px;">
                    ${item.price_note.split("|").map(p => p.trim()).map(p => `
                      <span style="background:#f0f9ff; color:#0369a1; font-size:12px; font-weight:700; padding:3px 8px; border-radius:6px; border:1px solid #bae6fd;">${esc(p)}</span>
                    `).join("")}
                  </div>
                </div>
              ` : isEggItem ? `
                <div style="margin-top:7px; font-size:13px; font-weight:700; color:#0f172a;">
                  ₹${item.price} / egg &nbsp;<span style="font-size:11px; color:#64748b; font-weight:400;">(2 eggs = ₹${item.price * 2})</span>
                </div>
              ` : `
                <div style="margin-top:7px; font-size:13px; font-weight:700; color:#0f172a;">
                  ₹${item.price} / ${unit}
                </div>
              `}
            </div>
            <div class="menu-item-right">
              ${isKg ? `
                <div style="text-align:right; margin-bottom:6px;">
                  <div style="font-size:10px; color:#94a3b8; font-weight:600;">Calc Rate</div>
                  <div style="font-size:16px; font-weight:800; color:#334155;">₹${item.price}<span style="font-size:10px; color:#94a3b8;">/kg</span></div>
                </div>
              ` : ``}
              <button class="edit-badge" onclick="window.fcp.openEditItemModal('${item.id}')">✏️ Edit Rate</button>
            </div>
          </div>
        `}).join("")}
      </div>
    `;
  }

  // 6. Reports View
  function renderReports() {
    const range = S.reportRange;
    const today = S.today;
    const closingsList = Object.values(S.closings || {}).sort((a, b) => (b.closing_date > a.closing_date ? 1 : -1));

    let filteredClosings = closingsList;
    if (range === "today") {
      filteredClosings = closingsList.filter((c) => c.closing_date === today);
    } else if (range === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const limit = d.toISOString().slice(0, 10);
      filteredClosings = closingsList.filter((c) => c.closing_date >= limit);
    } else if (range === "month") {
      const monthStart = today.slice(0, 7) + "-01";
      filteredClosings = closingsList.filter((c) => c.closing_date >= monthStart);
    }

    const totalRev = filteredClosings.reduce((s, c) => s + +c.total_revenue, 0);
    const totalExp = filteredClosings.reduce((s, c) => s + +c.total_expenses, 0);
    const totalProfit = filteredClosings.reduce((s, c) => s + +c.net_profit, 0);

    return `
      <div class="header-bar">
        <div>
          <div class="brand-title">📊 Business Reports & Daily P&L</div>
          <div class="brand-sub">Daily closing records, sales revenue & profit history</div>
        </div>
        <button class="action-btn dark" style="padding:8px 12px; font-size:12px; background:#0284c7;" onclick="window.fcp.openExportModal()">
          📤 Export Data
        </button>
      </div>

      <div class="chips-scroll">
        <button class="chip ${range === "today" ? "active" : ""}" onclick="window.fcp.filterReportRange('today')">Today</button>
        <button class="chip ${range === "week" ? "active" : ""}" onclick="window.fcp.filterReportRange('week')">This Week</button>
        <button class="chip ${range === "month" ? "active" : ""}" onclick="window.fcp.filterReportRange('month')">This Month</button>
        <button class="chip ${range === "all" ? "active" : ""}" onclick="window.fcp.filterReportRange('all')">All Time</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Net Profit</div>
          <div class="kpi-amount ${totalProfit >= 0 ? "profit-pos" : "profit-neg"}">${formatCurrency(totalProfit)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-amount revenue-color">${formatCurrency(totalRev)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Expenses</div>
          <div class="kpi-amount expense-color">${formatCurrency(totalExp)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Closed Days</div>
          <div class="kpi-amount">${filteredClosings.length}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2>📅 Daily Settlement History</h2>
        </div>

        ${filteredClosings.length === 0 ? `
          <div class="empty-box">
            <span>📅</span>
            No settled closings found for this period.
          </div>
        ` : `
          <div class="tx-list">
            ${filteredClosings.map(c => `
              <div class="wizard-card" style="padding:14px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:8px; margin-bottom:8px;">
                  <div>
                    <b>📅 ${formatDisplayDate(c.closing_date)}</b>
                    <span class="badge-status ${c.net_profit >= 0 ? "badge-online" : "badge-demo"}" style="margin-left:6px;">
                      Profit: ${formatCurrency(c.net_profit)}
                    </span>
                  </div>
                  <button class="edit-badge" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;" 
                    onclick="window.fcp.openExportModal('${c.closing_date}')">
                    📥 Export
                  </button>
                </div>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; font-size:12px;">
                  <div>
                    <span style="color:#64748b;">Revenue:</span><br>
                    <b>${formatCurrency(c.total_revenue)}</b>
                  </div>
                  <div>
                    <span style="color:#64748b;">Expenses:</span><br>
                    <b class="expense-color">${formatCurrency(c.total_expenses)}</b>
                  </div>
                  <div>
                    <span style="color:#64748b;">Cash Tally:</span><br>
                    <b style="color:${c.cash_difference === 0 ? '#16a34a' : '#ef4444'};">
                      ${c.cash_difference === 0 ? "Matched" : formatCurrency(c.cash_difference)}
                    </b>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
  }

  // --- Modals ---

  // 1. Add Expense Modal
  function openAddExpenseModal() {
    const modalEl = document.querySelector("#modal");
    modalEl.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this) window.fcp.closeModal()">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3>🛒 Add Purchase / Expense</h3>
            <button class="close-btn" onclick="window.fcp.closeModal()">✕</button>
          </div>
          <form onsubmit="window.fcp.saveExpense(event)">
            <div class="form-group">
              <label>Expense Category *</label>
              <select id="expCat" required onchange="window.fcp.toggleChickenBreakdown(this.value)">
                ${EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Total Amount (₹) *</label>
              <input type="number" step="any" min="1" id="expAmt" placeholder="e.g. 2400" required autofocus>
            </div>

            <div class="form-group">
              <label>Quantity / Weight</label>
              <input type="text" id="expQty" placeholder="e.g. 12 kg raw chicken">
            </div>

            <!-- CHICKEN BREAKDOWN PANEL — shows only for Raw Chicken Meat -->
            <div id="chicken-breakdown-panel" class="intake-card" style="display:none; margin:12px 0;">
              <div class="intake-header">
                <span class="intake-title">🍗 Chicken Breakdown (Auto-Syncs With Night Closing)</span>
                <span class="intake-tag">Live Sync</span>
              </div>

              <!-- Row 1: Total Raw Chicken & Pakora Meat with KG / Grams Unit Selectors -->
              <div class="intake-grid-2" style="margin-bottom: 8px;">
                <div class="intake-field">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                    <label style="margin-bottom:0; font-size:11px; font-weight:700;">Total Raw Chicken *</label>
                    <select class="field-unit-select" id="ckn-total-unit" onchange="window.fcp.recalcExpPakora()">
                      <option value="kg">kg</option>
                      <option value="g">grams</option>
                    </select>
                  </div>
                  <input type="number" step="any" min="0" id="ckn-total-val" placeholder="e.g. 12"
                    oninput="window.fcp.recalcExpPakora()" style="border:1.5px solid #fb923c;">
                </div>

                <div class="intake-field">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                    <label style="margin-bottom:0; font-size:11px; font-weight:700;">Pakora Chicken Meat</label>
                    <select class="field-unit-select" id="ckn-pakora-unit" onchange="window.fcp.recalcExpPakora()">
                      <option value="kg">kg</option>
                      <option value="g">grams</option>
                    </select>
                  </div>
                  <input type="number" step="any" min="0" id="ckn-pakora-val" placeholder="0"
                    style="border:1.5px solid #fb923c; color:#ea580c; font-weight:800;">
                </div>
              </div>

              <!-- Cuts Grid: Wings, Full Joint, Half Joint, Liver -->
              <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 8px;">
                <!-- Wings -->
                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Wings</div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                      <input type="number" step="1" min="0" id="ckn-wings-pcs" placeholder="pcs" oninput="window.fcp.recalcExpPakora()">
                    </div>
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                      <input type="number" step="any" min="0" id="ckn-wings-wt" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                    </div>
                  </div>
                </div>

                <!-- Full Joint -->
                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Full Joint</div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                      <input type="number" step="1" min="0" id="ckn-full-joint-pcs" placeholder="pcs" oninput="window.fcp.recalcExpPakora()">
                    </div>
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                      <input type="number" step="any" min="0" id="ckn-full-joint-wt" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                    </div>
                  </div>
                </div>

                <!-- Half Joint -->
                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Half Joint</div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                      <input type="number" step="1" min="0" id="ckn-half-joint-pcs" placeholder="pcs" oninput="window.fcp.recalcExpPakora()">
                    </div>
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                      <input type="number" step="any" min="0" id="ckn-half-joint-wt" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                    </div>
                  </div>
                </div>

                <!-- Liver -->
                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Liver</div>
                  <div>
                    <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (grams)</span>
                    <input type="number" step="any" min="0" id="ckn-liver-wt" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                  </div>
                </div>
              </div>

              <button type="button" class="action-btn dark" style="width:100%; padding:8px; font-size:12px;"
                onclick="window.fcp.applyChickenBreakdownToStock()">
                ⚡ Apply Breakdown to Night Closing Now
              </button>
            </div>

            <div class="form-group">
              <label>Date</label>
              <input type="date" id="expDate" value="${S.selectedDate || S.today}" required>
            </div>

            <div class="form-group">
              <label>Payment Method</label>
              <div class="pay-options">
                <div class="pay-opt-btn selected" onclick="window.fcp.selectPayOption(this, 'Cash')">💵 Cash</div>
                <div class="pay-opt-btn" onclick="window.fcp.selectPayOption(this, 'UPI')">📱 UPI / QR</div>
                <div class="pay-opt-btn" onclick="window.fcp.selectPayOption(this, 'Bank')">🏦 Bank</div>
              </div>
              <input type="hidden" id="expPayMethod" value="Cash">
            </div>

            <div class="form-group">
              <label>Notes / Description</label>
              <input type="text" id="expDesc" placeholder="e.g. Sourced from poultry vendor">
            </div>

            <div class="modal-actions">
              <button type="button" class="action-btn light" onclick="window.fcp.closeModal()">Cancel</button>
              <button type="submit" class="action-btn green">💾 Save Expense</button>
            </div>
          </form>
        </div>
      </div>
    `;
    setTimeout(() => {
      toggleChickenBreakdown(document.querySelector("#expCat")?.value || "Raw Chicken Meat");
    }, 20);
  }

  function toggleChickenBreakdown(catVal) {
    const p = document.querySelector("#chicken-breakdown-panel");
    if (!p) return;
    if (catVal === "Raw Chicken Meat") {
      p.style.display = "block";
    } else {
      p.style.display = "none";
    }
  }

  function recalcExpPakora() {
    const totalVal = +document.querySelector("#ckn-total-val")?.value || 0;
    const totalUnit = document.querySelector("#ckn-total-unit")?.value || 'kg';
    const totalG = (totalUnit === 'g' || totalUnit === 'grams') ? totalVal : totalVal * 1000;

    const wingsWt = +document.querySelector("#ckn-wings-wt")?.value || 0;
    const fullJointWt = +document.querySelector("#ckn-full-joint-wt")?.value || 0;
    const halfJointWt = +document.querySelector("#ckn-half-joint-wt")?.value || 0;
    const liverG = +document.querySelector("#ckn-liver-wt")?.value || 0;

    const cutsTotalG = wingsWt + fullJointWt + halfJointWt + liverG;
    const pakoraG = Math.max(0, totalG - cutsTotalG);

    const pakoraUnit = document.querySelector("#ckn-pakora-unit")?.value || 'kg';
    const pakoraVal = (pakoraUnit === 'g' || pakoraUnit === 'grams') ? pakoraG : Math.round((pakoraG / 1000) * 1000) / 1000;

    const pakoraInp = document.querySelector("#ckn-pakora-val");
    if (pakoraInp) {
      pakoraInp.value = pakoraVal > 0 ? pakoraVal : '';
    }

    const expQty = document.querySelector("#expQty") || document.querySelector("#editExpQty");
    if (expQty && totalVal > 0) {
      expQty.value = `${totalVal} ${totalUnit}`;
    }
  }

  function applyChickenBreakdownToStock(customDate) {
    const dateStr = customDate || document.querySelector("#expDate")?.value || document.querySelector("#editExpDate")?.value || S.selectedDate || S.today;
    if (!S.closings[dateStr]) {
      S.closings[dateStr] = getClosingForDate(dateStr);
    }
    const closing = S.closings[dateStr];

    const totalVal = +document.querySelector("#ckn-total-val")?.value || 0;
    const totalUnit = document.querySelector("#ckn-total-unit")?.value || 'kg';
    const totalKg = (totalUnit === 'g' || totalUnit === 'grams') ? totalVal / 1000 : totalVal;

    const pakoraVal = +document.querySelector("#ckn-pakora-val")?.value || 0;
    const pakoraUnit = document.querySelector("#ckn-pakora-unit")?.value || 'kg';
    const pakoraKg = (pakoraUnit === 'g' || pakoraUnit === 'grams') ? pakoraVal / 1000 : pakoraVal;

    const wingsPcs = +document.querySelector("#ckn-wings-pcs")?.value || 0;
    const wingsWt = +document.querySelector("#ckn-wings-wt")?.value || 0;

    const fullJointPcs = +document.querySelector("#ckn-full-joint-pcs")?.value || 0;
    const fullJointWt = +document.querySelector("#ckn-full-joint-wt")?.value || 0;

    const halfJointPcs = +document.querySelector("#ckn-half-joint-pcs")?.value || 0;
    const halfJointWt = +document.querySelector("#ckn-half-joint-wt")?.value || 0;

    const liverG = +document.querySelector("#ckn-liver-wt")?.value || 0;

    // Save into closing state
    closing.raw_chicken_intake_val = totalVal;
    closing.raw_chicken_intake_unit = totalUnit;
    closing.raw_chicken_intake_kg = totalKg;

    closing.raw_pakora_meat_val = pakoraVal;
    closing.raw_pakora_meat_unit = pakoraUnit;
    closing.raw_pakora_meat_kg = pakoraKg;

    closing.wings_pieces = wingsPcs;
    closing.wings_weight = wingsWt;

    closing.full_joint_pieces = fullJointPcs;
    closing.full_joint_weight = fullJointWt;

    closing.half_joint_pieces = halfJointPcs;
    closing.half_joint_weight = halfJointWt;

    closing.liver_val = liverG;
    closing.liver_unit = 'g';

    saveLocal("closings", S.closings);

    // Sync to dailyStock
    if (!S.dailyStock[dateStr]) {
      S.dailyStock[dateStr] = getStockLinesForDate(dateStr);
    }
    const lines = S.dailyStock[dateStr];
    if (lines) {
      lines.forEach((line, idx) => {
        if (line.item_id === "item-chicken-wings" && wingsPcs > 0) {
          line.added_unit = "pieces";
          updateStockLineValue(idx, 'added_val', wingsPcs);
        } else if (line.item_id === "item-chicken-full-joint" && fullJointPcs > 0) {
          line.added_unit = "pieces";
          updateStockLineValue(idx, 'added_val', fullJointPcs);
        } else if (line.item_id === "item-chicken-half-joint" && halfJointPcs > 0) {
          line.added_unit = "pieces";
          updateStockLineValue(idx, 'added_val', halfJointPcs);
        } else if (line.item_id === "item-chicken-liver" && liverG > 0) {
          line.added_unit = "g";
          updateStockLineValue(idx, 'added_val', liverG);
        }
      });
      saveLocal("dailyStock", S.dailyStock);
    }

    // Auto-fill description in expense form
    const descInput = document.querySelector("#expDesc") || document.querySelector("#editExpDesc");
    if (descInput && !descInput.value) {
      const parts = [];
      if (totalVal > 0) parts.push(`${totalVal}${totalUnit} raw chicken`);
      if (wingsPcs > 0) parts.push(`${wingsPcs} wings (${wingsWt}g)`);
      if (fullJointPcs > 0) parts.push(`${fullJointPcs} full joints (${fullJointWt}g)`);
      if (halfJointPcs > 0) parts.push(`${halfJointPcs} half joints (${halfJointWt}g)`);
      if (liverG > 0) parts.push(`${liverG}g liver`);
      if (pakoraVal > 0) parts.push(`${pakoraVal}${pakoraUnit} pakora meat`);
      descInput.value = parts.join(", ");
    }

    showToast("✅ Chicken breakdown saved & synced to Night Closing!");
  }

  function recalcChickenPakora(dateStr, isManualPakoraEdit = false) {
    dateStr = dateStr || S.selectedDate || S.today;
    if (!S.closings[dateStr]) {
      S.closings[dateStr] = getClosingForDate(dateStr);
    }
    const closing = S.closings[dateStr];

    const totalVal = +closing.raw_chicken_intake_val || 0;
    const totalUnit = closing.raw_chicken_intake_unit || 'kg';
    const totalGrams = (totalUnit === 'g' || totalUnit === 'grams') ? totalVal : totalVal * 1000;
    closing.raw_chicken_intake_kg = Math.round((totalGrams / 1000) * 1000) / 1000;

    const wingsWt = +closing.wings_weight || 0;
    const fullJointWt = +closing.full_joint_weight || 0;
    const halfJointWt = +closing.half_joint_weight || 0;
    const liverG = +closing.liver_val || 0;

    const cutsTotalG = wingsWt + fullJointWt + halfJointWt + liverG;
    const pakoraGrams = Math.max(0, totalGrams - cutsTotalG);
    const pakoraUnit = closing.raw_pakora_meat_unit || 'kg';

    if (!isManualPakoraEdit) {
      const pakoraVal = (pakoraUnit === 'g' || pakoraUnit === 'grams') ? pakoraGrams : Math.round((pakoraGrams / 1000) * 1000) / 1000;
      closing.raw_pakora_meat_val = pakoraVal;
      closing.raw_pakora_meat_kg = Math.round((pakoraGrams / 1000) * 1000) / 1000;

      const inp = document.querySelector("#intake-pakora-meat-input");
      if (inp) {
        inp.value = pakoraVal > 0 ? pakoraVal : '';
      }
    } else {
      const pakoraVal = +closing.raw_pakora_meat_val || 0;
      closing.raw_pakora_meat_kg = (pakoraUnit === 'g' || pakoraUnit === 'grams') ? pakoraVal / 1000 : pakoraVal;
    }

    saveLocal("closings", S.closings);
  }

  function updateChickenIntakeVal(field, val, isManualPakora = false) {
    const dateStr = S.selectedDate || S.today;
    if (!S.closings[dateStr]) {
      S.closings[dateStr] = getClosingForDate(dateStr);
    }
    S.closings[dateStr][field] = val;
    recalcChickenPakora(dateStr, isManualPakora);
  }

  function updateChickenIntakeUnit(field, unit) {
    const dateStr = S.selectedDate || S.today;
    if (!S.closings[dateStr]) {
      S.closings[dateStr] = getClosingForDate(dateStr);
    }
    S.closings[dateStr][field] = unit;
    recalcChickenPakora(dateStr, false);
  }

  function updateChickenIntakeCut(field, val, stockIdx) {
    const dateStr = S.selectedDate || S.today;
    if (!S.closings[dateStr]) {
      S.closings[dateStr] = getClosingForDate(dateStr);
    }
    S.closings[dateStr][field] = val;
    saveLocal("closings", S.closings);

    // If piece count or liver weight, sync to stock line
    if (stockIdx !== undefined && stockIdx !== null && stockIdx >= 0) {
      if (!S.dailyStock[dateStr]) {
        S.dailyStock[dateStr] = getStockLinesForDate(dateStr);
      }
      const lines = S.dailyStock[dateStr];
      if (lines && lines[stockIdx]) {
        if (field === 'liver_val') {
          lines[stockIdx].added_unit = 'g';
        } else {
          lines[stockIdx].added_unit = 'pieces';
        }
        updateStockLineValue(stockIdx, 'added_val', val);

        // Sync corresponding input in the stock row below if in DOM
        const lineEl = document.querySelector(`#stock-row-${stockIdx}`);
        if (lineEl) {
          const addedInp = lineEl.querySelector('.calc-field:nth-child(2) input');
          if (addedInp && addedInp.value !== val) {
            addedInp.value = val;
          }
        }
      }
    }

    // If cut weight changed, recalculate remaining pakora meat
    if (field.includes('weight') || field === 'liver_val') {
      recalcChickenPakora(dateStr, false);
    }
  }

  function updateChickenIntake(field, val) {
    updateChickenIntakeVal(field, val);
  }

  function syncChickenPartAdded(idx, val, unit) {
    updateChickenIntakeCut('pieces', val, idx);
  }

  // 2. Edit Expense Modal (Direct Edit Support)
  function openEditExpenseModal(expId) {
    const exp = (S.expenses || []).find((e) => e.id === expId);
    if (!exp) return;

    const dateStr = exp.expense_date || S.today;
    const closing = getClosingForDate(dateStr);
    const isChicken = exp.category === "Raw Chicken Meat";

    const modalEl = document.querySelector("#modal");
    modalEl.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this) window.fcp.closeModal()">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3>✏️ Edit Purchase / Expense</h3>
            <button class="close-btn" onclick="window.fcp.closeModal()">✕</button>
          </div>
          <form onsubmit="window.fcp.saveExpenseEdit(event, '${exp.id}')">
            <div class="form-group">
              <label>Expense Category *</label>
              <select id="editExpCat" required onchange="window.fcp.toggleChickenBreakdown(this.value)">
                ${EXPENSE_CATEGORIES.map(c => `<option value="${c}" ${exp.category === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Amount (₹) *</label>
              <input type="number" step="any" min="1" id="editExpAmt" value="${exp.amount}" required autofocus>
            </div>

            <div class="form-group">
              <label>Quantity / Weight</label>
              <input type="text" id="editExpQty" value="${esc(exp.quantity || "")}" placeholder="e.g. 15 kg raw chicken">
            </div>

            <!-- CHICKEN BREAKDOWN PANEL IN EDIT MODAL -->
            <div id="chicken-breakdown-panel" class="intake-card" style="display:${isChicken ? 'block' : 'none'}; margin:12px 0;">
              <div class="intake-header">
                <span class="intake-title">🍗 Chicken Breakdown</span>
                <span class="intake-tag">Live Sync</span>
              </div>

              <div class="intake-grid-2" style="margin-bottom: 8px;">
                <div class="intake-field">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                    <label style="margin-bottom:0; font-size:11px; font-weight:700;">Total Raw Chicken</label>
                    <select class="field-unit-select" id="ckn-total-unit" onchange="window.fcp.recalcExpPakora()">
                      <option value="kg" ${(closing.raw_chicken_intake_unit || 'kg') === 'kg' ? 'selected' : ''}>kg</option>
                      <option value="g" ${(closing.raw_chicken_intake_unit || 'kg') === 'g' || closing.raw_chicken_intake_unit === 'grams' ? 'selected' : ''}>grams</option>
                    </select>
                  </div>
                  <input type="number" step="any" min="0" id="ckn-total-val" value="${closing.raw_chicken_intake_val || closing.raw_chicken_intake_kg || ''}" placeholder="e.g. 12"
                    oninput="window.fcp.recalcExpPakora()" style="border:1.5px solid #fb923c;">
                </div>

                <div class="intake-field">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                    <label style="margin-bottom:0; font-size:11px; font-weight:700;">Pakora Chicken Meat</label>
                    <select class="field-unit-select" id="ckn-pakora-unit" onchange="window.fcp.recalcExpPakora()">
                      <option value="kg" ${(closing.raw_pakora_meat_unit || 'kg') === 'kg' ? 'selected' : ''}>kg</option>
                      <option value="g" ${(closing.raw_pakora_meat_unit || 'kg') === 'g' || closing.raw_pakora_meat_unit === 'grams' ? 'selected' : ''}>grams</option>
                    </select>
                  </div>
                  <input type="number" step="any" min="0" id="ckn-pakora-val" value="${closing.raw_pakora_meat_val || closing.raw_pakora_meat_kg || ''}" placeholder="0"
                    style="border:1.5px solid #fb923c; color:#ea580c; font-weight:800;">
                </div>
              </div>

              <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 8px;">
                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Wings</div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                      <input type="number" step="1" min="0" id="ckn-wings-pcs" value="${closing.wings_pieces || ''}" placeholder="pcs" oninput="window.fcp.recalcExpPakora()">
                    </div>
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                      <input type="number" step="any" min="0" id="ckn-wings-wt" value="${closing.wings_weight || ''}" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                    </div>
                  </div>
                </div>

                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Full Joint</div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                      <input type="number" step="1" min="0" id="ckn-full-joint-pcs" value="${closing.full_joint_pieces || ''}" placeholder="pcs" oninput="window.fcp.recalcExpPakora()">
                    </div>
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                      <input type="number" step="any" min="0" id="ckn-full-joint-wt" value="${closing.full_joint_weight || ''}" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                    </div>
                  </div>
                </div>

                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Half Joint</div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Pieces</span>
                      <input type="number" step="1" min="0" id="ckn-half-joint-pcs" value="${closing.half_joint_pieces || ''}" placeholder="pcs" oninput="window.fcp.recalcExpPakora()">
                    </div>
                    <div>
                      <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (g)</span>
                      <input type="number" step="any" min="0" id="ckn-half-joint-wt" value="${closing.half_joint_weight || ''}" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                    </div>
                  </div>
                </div>

                <div class="cut-item" style="text-align:left; padding:6px 8px;">
                  <div style="font-size:10px; font-weight:700; color:#374151; margin-bottom:2px;">🍗 Liver</div>
                  <div>
                    <span style="font-size:9px; color:#64748b; font-weight:600;">Weight (grams)</span>
                    <input type="number" step="any" min="0" id="ckn-liver-wt" value="${closing.liver_val || ''}" placeholder="g" oninput="window.fcp.recalcExpPakora()">
                  </div>
                </div>
              </div>

              <button type="button" class="action-btn dark" style="width:100%; padding:8px; font-size:12px;"
                onclick="window.fcp.applyChickenBreakdownToStock('${dateStr}')">
                ⚡ Apply Breakdown to Night Closing Now
              </button>
            </div>

            <div class="form-group">
              <label>Date</label>
              <input type="date" id="editExpDate" value="${exp.expense_date || S.today}" required>
            </div>

            <div class="pay-options">
              <div class="pay-opt-btn ${exp.payment_method === "Cash" ? "selected" : ""}" onclick="window.fcp.selectPayOption(this, 'Cash')">💵 Cash</div>
              <div class="pay-opt-btn ${exp.payment_method === "UPI" ? "selected" : ""}" onclick="window.fcp.selectPayOption(this, 'UPI')">📱 UPI / QR</div>
              <div class="pay-opt-btn ${exp.payment_method === "Bank" ? "selected" : ""}" onclick="window.fcp.selectPayOption(this, 'Bank')">🏦 Bank</div>
            </div>
            <input type="hidden" id="expPayMethod" value="${exp.payment_method || "Cash"}">

            <div class="form-group" style="margin-top:14px;">
              <label>Notes / Description</label>
              <input type="text" id="editExpDesc" value="${esc(exp.description || "")}" placeholder="e.g. Details of expense">
            </div>

            <div class="modal-actions">
              <button type="button" class="action-btn light" onclick="window.fcp.closeModal()">Cancel</button>
              <button type="submit" class="action-btn green">💾 Update Expense</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // 3. Edit Menu Item Modal
  function openEditItemModal(itemId) {
    const item = (S.menu || []).find((m) => m.id === itemId);
    if (!item) return;

    const modalEl = document.querySelector("#modal");
    modalEl.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this) window.fcp.closeModal()">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3>✏️ Edit Item Rate & Unit</h3>
            <button class="close-btn" onclick="window.fcp.closeModal()">✕</button>
          </div>
          <form onsubmit="window.fcp.saveItemEdit(event, '${item.id}')">
            <div class="form-group">
              <label>Item Name *</label>
              <input type="text" id="itemName" value="${esc(item.name)}" required>
            </div>

            <div class="form-group">
              <label>Selling Rate (₹) *</label>
              <input type="number" step="any" min="1" id="itemPrice" value="${item.price}" required>
            </div>

            <div class="form-group">
              <label>Measurement Unit</label>
              <select id="itemUnit">
                <option value="kg" ${(item.unit || "kg") === "kg" ? "selected" : ""}>Kg (Kilograms)</option>
                <option value="pieces" ${item.unit === "pieces" ? "selected" : ""}>Pieces (Wings, Joints, Eggs)</option>
                <option value="plates" ${item.unit === "plates" ? "selected" : ""}>Plates (Fast Food Dishes)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Price Note / Portions (Optional)</label>
              <input type="text" id="itemPriceNote" value="${esc(item.price_note || "")}" placeholder="e.g. 100g: ₹60 | 250g: ₹120">
            </div>

            <div class="modal-actions">
              <button type="button" class="action-btn light" onclick="window.fcp.closeModal()">Cancel</button>
              <button type="submit" class="action-btn green">💾 Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // 4. Add Menu Item Modal
  function openAddItemModal() {
    const modalEl = document.querySelector("#modal");
    modalEl.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this) window.fcp.closeModal()">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3>🍗 Add New Menu Item</h3>
            <button class="close-btn" onclick="window.fcp.closeModal()">✕</button>
          </div>
          <form onsubmit="window.fcp.saveNewItem(event)">
            <div class="form-group">
              <label>Item Name *</label>
              <input type="text" id="newItemName" placeholder="e.g. Chicken Boneless Pakoda" required>
            </div>

            <div class="form-group">
              <label>Category</label>
              <select id="newItemCat">
                <option value="Chicken">Chicken</option>
                <option value="Egg">Egg</option>
                <option value="Fish">Fish</option>
                <option value="Veg/FastFood">Veg/FastFood</option>
              </select>
            </div>

            <div class="form-group">
              <label>Selling Rate (₹) *</label>
              <input type="number" step="any" min="1" id="newItemPrice" placeholder="e.g. 520" required>
            </div>

            <div class="form-group">
              <label>Measurement Unit</label>
              <select id="newItemUnit">
                <option value="kg">Kg (Kilograms)</option>
                <option value="pieces">Pieces</option>
                <option value="plates">Plates</option>
              </select>
            </div>

            <div class="form-group">
              <label>Price Note (Optional)</label>
              <input type="text" id="newItemNote" placeholder="e.g. ₹60 per plate or ₹520/kg">
            </div>

            <div class="modal-actions">
              <button type="button" class="action-btn light" onclick="window.fcp.closeModal()">Cancel</button>
              <button type="submit" class="action-btn green">💾 Add Item</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // 5. Export Daily Data Modal
  function openExportModal(customDate) {
    const targetDate = customDate || S.selectedDate || S.today;
    const modalEl = document.querySelector("#modal");
    modalEl.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this) window.fcp.closeModal()">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3>📥 Export Daily Data & Reports</h3>
            <button class="close-btn" onclick="window.fcp.closeModal()">✕</button>
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Selected Date:</label>
            <input type="date" id="exportTargetDate" value="${targetDate}" 
              style="width:100%; border:1.5px solid #cbd5e1; border-radius:10px; padding:10px 12px; font-size:14px; font-weight:700; background:#fff;">
          </div>

          <div class="export-options-list">
            <!-- Option 1: WhatsApp Summary -->
            <div class="export-card" onclick="window.fcp.shareDayWhatsApp()">
              <div class="export-card-icon" style="background:#dcfce7; color:#16a34a;">💬</div>
              <div class="export-card-info">
                <h4>Share on WhatsApp / Copy Summary</h4>
                <p>Formatted text report with financial tally, cuts & sales</p>
              </div>
            </div>

            <!-- Option 2: Excel / CSV -->
            <div class="export-card" onclick="window.fcp.downloadDayCSV()">
              <div class="export-card-icon" style="background:#e0f2fe; color:#0284c7;">📊</div>
              <div class="export-card-info">
                <h4>Download Excel / CSV File</h4>
                <p>Full spreadsheet with stock, sales, cuts & expenses</p>
              </div>
            </div>

            <!-- Option 3: Print / PDF -->
            <div class="export-card" onclick="window.fcp.printDayStatement()">
              <div class="export-card-icon" style="background:#fef3c7; color:#d97706;">🖨️</div>
              <div class="export-card-info">
                <h4>Print / Save as PDF Statement</h4>
                <p>Official branded letterhead statement for accounts</p>
              </div>
            </div>
          </div>

          <div class="modal-actions" style="margin-top:16px;">
            <button type="button" class="action-btn light" style="grid-column: span 2;" onclick="window.fcp.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  function downloadDayCSV(targetDate) {
    const dateStr = targetDate || document.querySelector("#exportTargetDate")?.value || S.selectedDate || S.today;
    const closing = getClosingForDate(dateStr);
    const stockLines = getStockLinesForDate(dateStr);
    const dayExpenses = (S.expenses || []).filter((e) => e.expense_date === dateStr);
    const totals = computeDailyTotals(stockLines, closing.actual_cash_collected, closing.actual_upi_collected, dayExpenses, closing.master_wage);

    let csv = "\uFEFF"; // UTF-8 BOM

    // Section 1: Header & Financial Summary
    csv += `"FRIENDS CHICKEN PAKORA / RIYAN FAST FOODS - DAILY STATEMENT"\n`;
    csv += `"Date","${dateStr} (${formatDisplayDate(dateStr)})"\n`;
    csv += `"Total Revenue (₹)","${totals.actualCollected}"\n`;
    csv += `"Actual Cash Collected (₹)","${closing.actual_cash_collected || 0}"\n`;
    csv += `"Actual UPI Collected (₹)","${closing.actual_upi_collected || 0}"\n`;
    csv += `"Expected Sales from Stock (₹)","${totals.expectedSales}"\n`;
    csv += `"Cash Tally Discrepancy (₹)","${totals.cashDifference}"\n`;
    csv += `"Total Expenses (₹)","${totals.totalExpenses}"\n`;
    csv += `"Master Daily Wage (₹)","${closing.master_wage || S.masterDailyWage}"\n`;
    csv += `"Net Profit (₹)","${totals.netProfit}"\n\n`;

    // Section 2: Morning Raw Chicken Intake & Cuts Breakdown
    csv += `"MORNING RAW CHICKEN BREAKDOWN"\n`;
    csv += `"Total Raw Chicken (kg)","${closing.raw_chicken_intake_kg || 0}"\n`;
    csv += `"Pakora Chicken Meat (kg)","${closing.raw_pakora_meat_kg || 0}"\n`;
    csv += `"Wings","${closing.wings_pieces || 0} pcs (${closing.wings_weight || 0} g)"\n`;
    csv += `"Full Joint","${closing.full_joint_pieces || 0} pcs (${closing.full_joint_weight || 0} g)"\n`;
    csv += `"Half Joint","${closing.half_joint_pieces || 0} pcs (${closing.half_joint_weight || 0} g)"\n`;
    csv += `"Liver (g)","${closing.liver_val || 0} g"\n\n`;

    // Section 3: Item-Wise Stock & Sales Table
    csv += `"ITEM-WISE STOCK & SALES RECONCILIATION"\n`;
    csv += `"Item Name","Category","Rate (₹)","Unit","Opening Stock","Added Today","Closing Stock (Left)","Sold Quantity","Expected Sales (₹)"\n`;
    stockLines.forEach((l) => {
      csv += `"${l.item_name}","${l.category || ''}","${l.unit_price}","${l.item_unit || 'kg'}","${l.opening_stock}","${l.marinated_added_stock}","${l.closing_stock}","${l.sold_quantity}","${l.total_sales}"\n`;
    });
    csv += `\n`;

    // Section 4: Itemized Expenses & Purchases
    csv += `"TODAY'S PURCHASES & EXPENSES"\n`;
    csv += `"Expense ID","Category","Amount (₹)","Payment Method","Quantity / Weight","Description"\n`;
    if (dayExpenses.length === 0) {
      csv += `"No expenses recorded for this date"\n`;
    } else {
      dayExpenses.forEach((e) => {
        csv += `"${e.id}","${e.category}","${e.amount}","${e.payment_method || 'Cash'}","${e.quantity || ''}","${(e.description || '').replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Friends_Chicken_Pakora_Report_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("📊 Excel/CSV Report downloaded successfully!");
  }

  function shareDayWhatsApp(targetDate) {
    const dateStr = targetDate || document.querySelector("#exportTargetDate")?.value || S.selectedDate || S.today;
    const closing = getClosingForDate(dateStr);
    const stockLines = getStockLinesForDate(dateStr);
    const dayExpenses = (S.expenses || []).filter((e) => e.expense_date === dateStr);
    const totals = computeDailyTotals(stockLines, closing.actual_cash_collected, closing.actual_upi_collected, dayExpenses, closing.master_wage);

    let text = `🍗 *FRIENDS CHICKEN PAKORA / RIYAN FAST FOODS*\n`;
    text += `📅 *Daily Closing Report:* ${formatDisplayDate(dateStr)}\n\n`;

    text += `💰 *FINANCIAL SUMMARY*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `• Total Revenue: *${formatCurrency(totals.actualCollected)}*\n`;
    text += `  └ Cash: ${formatCurrency(closing.actual_cash_collected || 0)} | UPI: ${formatCurrency(closing.actual_upi_collected || 0)}\n`;
    text += `• Expected from Stock: ${formatCurrency(totals.expectedSales)}\n`;
    text += `• Total Expenses: *${formatCurrency(totals.totalExpenses)}*\n`;
    text += `• Master Wage: ${formatCurrency(closing.master_wage || S.masterDailyWage)}\n`;
    text += `• *NET PROFIT: ${formatCurrency(totals.netProfit)}* ${totals.netProfit >= 0 ? '🟢' : '🔴'}\n`;
    text += `• Cash Tally: *${totals.cashDifference === 0 ? 'Matched (₹0)' : formatCurrency(totals.cashDifference)}*\n\n`;

    if (closing.raw_chicken_intake_kg || closing.raw_pakora_meat_kg || closing.wings_pieces) {
      text += `🍗 *MORNING CHICKEN CUTS*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      if (closing.raw_chicken_intake_kg) text += `• Total Raw: ${closing.raw_chicken_intake_kg} kg\n`;
      if (closing.raw_pakora_meat_kg) text += `• Pakora Meat: ${closing.raw_pakora_meat_kg} kg\n`;
      if (closing.wings_pieces) text += `• Wings: ${closing.wings_pieces} pcs (${closing.wings_weight || 0}g)\n`;
      if (closing.full_joint_pieces) text += `• Full Joint: ${closing.full_joint_pieces} pcs (${closing.full_joint_weight || 0}g)\n`;
      if (closing.half_joint_pieces) text += `• Half Joint: ${closing.half_joint_pieces} pcs (${closing.half_joint_weight || 0}g)\n`;
      if (closing.liver_val) text += `• Liver: ${closing.liver_val} g\n`;
      text += `\n`;
    }

    const soldItems = stockLines.filter(l => l.sold_quantity > 0);
    if (soldItems.length > 0) {
      text += `📊 *TOP ITEMS SOLD*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      soldItems.forEach(l => {
        text += `• ${l.item_name}: *${l.sold_quantity} ${l.item_unit || 'kg'}* → ${formatCurrency(l.total_sales)}\n`;
      });
      text += `\n`;
    }

    if (dayExpenses.length > 0) {
      text += `🛒 *EXPENSES LIST (${formatCurrency(totals.totalExpenses)})*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      dayExpenses.forEach(e => {
        text += `• ${e.category}: ${formatCurrency(e.amount)} (${e.payment_method || 'Cash'})\n`;
      });
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');

    showToast("📋 Report copied to clipboard & WhatsApp opened!");
  }

  function printDayStatement(targetDate) {
    const dateStr = targetDate || document.querySelector("#exportTargetDate")?.value || S.selectedDate || S.today;
    const closing = getClosingForDate(dateStr);
    const stockLines = getStockLinesForDate(dateStr);
    const dayExpenses = (S.expenses || []).filter((e) => e.expense_date === dateStr);
    const totals = computeDailyTotals(stockLines, closing.actual_cash_collected, closing.actual_upi_collected, dayExpenses, closing.master_wage);

    const printWin = window.open("", "_blank");
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Statement - ${dateStr} - Friends Chicken Pakora</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 4px; font-size: 22px; color: #059669; }
          .header p { margin: 0; font-size: 13px; color: #64748b; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
          .summary-box .lbl { font-size: 11px; color: #64748b; font-weight: bold; }
          .summary-box .val { font-size: 16px; font-weight: 800; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .num { text-align: right; }
          h3 { font-size: 14px; margin: 16px 0 8px; color: #334155; }
          .profit-green { color: #059669; }
          .profit-red { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍗 Friends Chicken Pakora / Riyan Fast Foods</h1>
          <p>Official Daily Settlement Statement · Date: <b>${formatDisplayDate(dateStr)}</b></p>
        </div>

        <div class="summary-grid">
          <div class="summary-box">
            <div class="lbl">TOTAL REVENUE</div>
            <div class="val">${formatCurrency(totals.actualCollected)}</div>
          </div>
          <div class="summary-box">
            <div class="lbl">TOTAL EXPENSES</div>
            <div class="val">${formatCurrency(totals.totalExpenses)}</div>
          </div>
          <div class="summary-box">
            <div class="lbl">MASTER WAGE</div>
            <div class="val">${formatCurrency(closing.master_wage || S.masterDailyWage)}</div>
          </div>
          <div class="summary-box">
            <div class="lbl">NET PROFIT</div>
            <div class="val ${totals.netProfit >= 0 ? 'profit-green' : 'profit-red'}">${formatCurrency(totals.netProfit)}</div>
          </div>
        </div>

        <h3>📊 Daily Stock Reconciliation</h3>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th class="num">Rate</th>
              <th class="num">Open</th>
              <th class="num">Added</th>
              <th class="num">Close</th>
              <th class="num">Sold</th>
              <th class="num">Expected Sales</th>
            </tr>
          </thead>
          <tbody>
            ${stockLines.map(l => `
              <tr>
                <td><b>${esc(l.item_name)}</b></td>
                <td>${esc(l.category || '')}</td>
                <td class="num">₹${l.unit_price}</td>
                <td class="num">${l.opening_stock} ${l.item_unit || 'kg'}</td>
                <td class="num">${l.marinated_added_stock} ${l.item_unit || 'kg'}</td>
                <td class="num">${l.closing_stock} ${l.item_unit || 'kg'}</td>
                <td class="num"><b>${l.sold_quantity} ${l.item_unit || 'kg'}</b></td>
                <td class="num"><b>${formatCurrency(l.total_sales)}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>🛒 Itemized Purchases & Expenses</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Quantity / Weight</th>
              <th>Payment</th>
              <th>Description</th>
              <th class="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${dayExpenses.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No expenses recorded</td></tr>` : 
              dayExpenses.map(e => `
                <tr>
                  <td><b>${esc(e.category)}</b></td>
                  <td>${esc(e.quantity || '—')}</td>
                  <td>${esc(e.payment_method || 'Cash')}</td>
                  <td>${esc(e.description || '—')}</td>
                  <td class="num"><b>${formatCurrency(e.amount)}</b></td>
                </tr>
              `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; display:flex; justify-content:space-between; font-size:12px; color:#64748b;">
          <div>Generated on: ${new Date().toLocaleString('en-IN')}</div>
          <div>Authorized Signature: ___________________</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  function closeModal() {
    const modalEl = document.querySelector("#modal");
    if (modalEl) modalEl.innerHTML = "";
  }

  // --- CRUD Handlers ---

  async function saveExpense(e) {
    e.preventDefault();
    const cat = document.querySelector("#expCat").value;
    const amt = +document.querySelector("#expAmt").value;
    const qty = document.querySelector("#expQty").value;
    const expDate = document.querySelector("#expDate").value || S.today;
    const pay = document.querySelector("#expPayMethod").value || "Cash";
    const desc = document.querySelector("#expDesc").value;

    // Auto-apply chicken breakdown if this is Raw Chicken Meat
    if (cat === "Raw Chicken Meat") {
      applyChickenBreakdownToStock(expDate);
    }

    const newExpense = {
      id: "exp-" + Date.now(),
      category: cat,
      amount: amt,
      quantity: qty,
      expense_date: expDate,
      payment_method: pay,
      description: desc,
      created_at: new Date().toISOString()
    };

    S.expenses.unshift(newExpense);
    saveLocal("expenses", S.expenses);

    if (db) {
      db.from("expenses").insert([newExpense]).then(({ error }) => {
        if (error) console.warn("Supabase expense insert error:", error);
      });
    }

    closeModal();
    showToast("✅ Expense recorded successfully!");
    render();
  }

  async function saveExpenseEdit(e, id) {
    e.preventDefault();
    const cat = document.querySelector("#editExpCat").value;
    const amt = +document.querySelector("#editExpAmt").value;
    const qty = document.querySelector("#editExpQty").value;
    const expDate = document.querySelector("#editExpDate").value || S.today;
    const pay = document.querySelector("#expPayMethod").value || "Cash";
    const desc = document.querySelector("#editExpDesc").value;

    // Auto-apply chicken breakdown if this is Raw Chicken Meat
    if (cat === "Raw Chicken Meat") {
      applyChickenBreakdownToStock(expDate);
    }

    const idx = (S.expenses || []).findIndex((exp) => exp.id === id);
    if (idx !== -1) {
      S.expenses[idx].category = cat;
      S.expenses[idx].amount = amt;
      S.expenses[idx].quantity = qty;
      S.expenses[idx].expense_date = expDate;
      S.expenses[idx].payment_method = pay;
      S.expenses[idx].description = desc;

      saveLocal("expenses", S.expenses);

      if (db) {
        db.from("expenses")
          .update({
            category: cat,
            amount: amt,
            quantity: qty,
            expense_date: expDate,
            payment_method: pay,
            description: desc
          })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.warn("Supabase expense update error:", error);
          });
      }
    }

    closeModal();
    showToast("✅ Expense updated successfully!");
    render();
  }

  async function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    S.expenses = (S.expenses || []).filter((e) => e.id !== id);
    saveLocal("expenses", S.expenses);

    if (db) {
      db.from("expenses").delete().eq("id", id).then(({ error }) => {
        if (error) console.warn("Supabase expense delete error:", error);
      });
    }

    showToast("🗑️ Expense deleted.");
    render();
  }

  async function saveItemEdit(e, id) {
    e.preventDefault();
    const name = document.querySelector("#itemName").value;
    const price = +document.querySelector("#itemPrice").value;
    const unit = document.querySelector("#itemUnit").value;
    const priceNote = document.querySelector("#itemPriceNote").value;

    const idx = (S.menu || []).findIndex((m) => m.id === id);
    if (idx !== -1) {
      S.menu[idx].name = name;
      S.menu[idx].price = price;
      S.menu[idx].unit = unit;
      S.menu[idx].price_note = priceNote;
      saveLocal("menu_v2", S.menu);

      // Also update active stock line unit & rate
      const dateStr = S.selectedDate;
      const lines = S.dailyStock[dateStr];
      if (lines) {
        const line = lines.find((l) => l.item_id === id);
        if (line) {
          line.unit_price = price;
          line.item_unit = unit;
          saveLocal("dailyStock", S.dailyStock);
        }
      }

      if (db) {
        db.from("menu_items")
          .update({ name, price, unit, price_note: priceNote })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.warn("Supabase menu update error:", error);
          });
      }
    }

    closeModal();
    showToast("✅ Item rate updated!");
    render();
  }

  async function saveNewItem(e) {
    e.preventDefault();
    const name = document.querySelector("#newItemName").value;
    const category = document.querySelector("#newItemCat").value;
    const price = +document.querySelector("#newItemPrice").value;
    const unit = document.querySelector("#newItemUnit").value;
    const priceNote = document.querySelector("#newItemNote").value;

    const newItem = {
      id: "item-" + Date.now(),
      name,
      category,
      unit,
      price,
      price_note: priceNote,
      is_active: true,
      sort_order: S.menu.length + 1
    };

    S.menu.push(newItem);
    saveLocal("menu_v2", S.menu);

    // Add to current date's stock list
    const dateStr = S.selectedDate;
    if (S.dailyStock[dateStr]) {
      const isWeight = unit === "kg" || unit === "grams";
      S.dailyStock[dateStr].push(sanitizeStockLine({
        item_id: newItem.id,
        item_name: newItem.name,
        unit: isWeight ? "kg" : unit,
        unit_price: newItem.price,
        opening_val: 0,
        added_val: 0,
        closing_val: 0
      }, newItem));
      saveLocal("dailyStock", S.dailyStock);
    }

    if (db) {
      db.from("menu_items").insert([newItem]).then(({ error }) => {
        if (error) console.warn("Supabase menu insert error:", error);
      });
    }

    closeModal();
    showToast("✅ New item added to master catalog!");
    render();
  }

  // --- Real-time Stock Line Updates in Closing Wizard (IN-PLACE DOM UPDATE) ---
  function updateStockLineValue(idx, field, val) {
    const dateStr = S.selectedDate;
    if (!S.dailyStock[dateStr]) {
      S.dailyStock[dateStr] = getStockLinesForDate(dateStr);
    }
    const lines = S.dailyStock[dateStr];
    if (lines && lines[idx]) {
      lines[idx][field] = +val || 0;

      const itemUnitStr = (lines[idx].item_unit || "kg").toLowerCase();
      const isWeight = itemUnitStr === "kg" || itemUnitStr === "grams" || itemUnitStr === "g";
      const isEggs = itemUnitStr === "eggs" || itemUnitStr === "egg" || lines[idx].item_id === "item-eggs-stock";
      const baseUnit = isWeight ? "kg" : (isEggs ? "eggs" : itemUnitStr);

      const openNorm = normalizeToBase(lines[idx].opening_val, lines[idx].opening_unit || baseUnit, baseUnit);
      const addedNorm = normalizeToBase(lines[idx].added_val, lines[idx].added_unit || baseUnit, baseUnit);
      const closingNorm = normalizeToBase(lines[idx].closing_val, lines[idx].closing_unit || baseUnit, baseUnit);

      const soldNorm = Math.max(0, Math.round((openNorm + addedNorm - closingNorm) * 1000) / 1000);
      lines[idx].sold_quantity = soldNorm;
      lines[idx].opening_stock = openNorm;
      lines[idx].marinated_added_stock = addedNorm;
      lines[idx].closing_stock = closingNorm;

      const itemSales = soldNorm * (+lines[idx].unit_price || 0);
      lines[idx].total_sales = Math.round(itemSales);

      saveLocal("dailyStock", S.dailyStock);

      if (field === 'closing_val') {
        syncClosingToNextDay(dateStr);
      }

      // In-place update of badges without re-rendering the whole page!
      const soldBadge = document.querySelector(`#sold-badge-${idx}`);
      if (soldBadge) {
        soldBadge.innerHTML = `Sold: <b>${soldNorm} ${itemUnitStr}</b> ${isWeight && soldNorm > 0 ? `<span style="color:#64748b; font-size:11px;">(~${Math.round(soldNorm * 1000)} g)</span>` : (isEggs && soldNorm >= 30 ? `<span style="color:#64748b; font-size:11px;">(~${(Math.round((soldNorm / 30) * 10) / 10)} crates)</span>` : '')}`;
      }
      const salesBadge = document.querySelector(`#sales-badge-${idx}`);
      if (salesBadge) {
        salesBadge.textContent = `Expected Sales: ${formatCurrency(lines[idx].total_sales)}`;
      }

      // Update Tally & Bottom Totals in-place
      refreshClosingTotalsInDOM();
    }
  }

  function updateFieldUnit(idx, unitField, newUnit) {
    const dateStr = S.selectedDate;
    if (!S.dailyStock[dateStr]) {
      S.dailyStock[dateStr] = getStockLinesForDate(dateStr);
    }
    const lines = S.dailyStock[dateStr];
    if (lines && lines[idx]) {
      lines[idx][unitField] = newUnit;

      const itemUnitStr = (lines[idx].item_unit || "kg").toLowerCase();
      const isWeight = itemUnitStr === "kg" || itemUnitStr === "grams" || itemUnitStr === "g";
      const isEggs = itemUnitStr === "eggs" || itemUnitStr === "egg" || lines[idx].item_id === "item-eggs-stock";
      const baseUnit = isWeight ? "kg" : (isEggs ? "eggs" : itemUnitStr);

      const openNorm = normalizeToBase(lines[idx].opening_val, lines[idx].opening_unit || baseUnit, baseUnit);
      const addedNorm = normalizeToBase(lines[idx].added_val, lines[idx].added_unit || baseUnit, baseUnit);
      const closingNorm = normalizeToBase(lines[idx].closing_val, lines[idx].closing_unit || baseUnit, baseUnit);

      const soldNorm = Math.max(0, Math.round((openNorm + addedNorm - closingNorm) * 1000) / 1000);
      lines[idx].sold_quantity = soldNorm;
      lines[idx].opening_stock = openNorm;
      lines[idx].marinated_added_stock = addedNorm;
      lines[idx].closing_stock = closingNorm;

      const itemSales = soldNorm * (+lines[idx].unit_price || 0);
      lines[idx].total_sales = Math.round(itemSales);

      saveLocal("dailyStock", S.dailyStock);

      if (unitField === 'closing_unit') {
        syncClosingToNextDay(dateStr);
      }

      const soldBadge = document.querySelector(`#sold-badge-${idx}`);
      if (soldBadge) {
        soldBadge.innerHTML = `Sold: <b>${soldNorm} ${itemUnitStr}</b> ${isWeight && soldNorm > 0 ? `<span style="color:#64748b; font-size:11px;">(~${Math.round(soldNorm * 1000)} g)</span>` : (isEggs && soldNorm >= 30 ? `<span style="color:#64748b; font-size:11px;">(~${(Math.round((soldNorm / 30) * 10) / 10)} crates)</span>` : '')}`;
      }
      const salesBadge = document.querySelector(`#sales-badge-${idx}`);
      if (salesBadge) {
        salesBadge.textContent = `Expected Sales: ${formatCurrency(lines[idx].total_sales)}`;
      }

      refreshClosingTotalsInDOM();
    }
  }

  function updateClosingField(field, val) {
    const dateStr = S.selectedDate;
    if (!S.closings[dateStr]) {
      S.closings[dateStr] = getClosingForDate(dateStr);
    }
    S.closings[dateStr][field] = +val || 0;
    saveLocal("closings", S.closings);

    // In-place refresh of totals without losing keyboard focus!
    refreshClosingTotalsInDOM();
  }

  // --- Batch Helper: sum all batches into added_val (KG items) ---
  function _recomputeBatchTotal(idx) {
    const dateStr = S.selectedDate;
    if (!S.dailyStock[dateStr]) return;
    const lines = S.dailyStock[dateStr];
    if (!lines || !lines[idx]) return;
    const line = lines[idx];

    const batches = line.batches || [];
    // Sum all batches normalised to kg
    let totalKg = 0;
    batches.forEach((b) => {
      const v = +b.val || 0;
      totalKg += (b.unit === 'g' || b.unit === 'grams') ? v / 1000 : v;
    });
    totalKg = Math.round(totalKg * 1000) / 1000;

    // Store normalised total as added_val in kg
    line.added_val = totalKg;
    line.added_unit = 'kg';

    // Recompute sold & sales
    const openNorm = normalizeToBase(line.opening_val, line.opening_unit || 'kg', 'kg');
    const closingNorm = normalizeToBase(line.closing_val, line.closing_unit || 'kg', 'kg');
    const soldNorm = Math.max(0, Math.round((openNorm + totalKg - closingNorm) * 1000) / 1000);
    line.sold_quantity = soldNorm;
    line.opening_stock = openNorm;
    line.marinated_added_stock = totalKg;
    line.closing_stock = closingNorm;
    line.total_sales = Math.round(soldNorm * (+line.unit_price || 0));

    saveLocal("dailyStock", S.dailyStock);

    // In-place DOM badge updates (no focus jump)
    const itemUnitStr = (line.item_unit || 'kg').toLowerCase();
    const soldBadge = document.querySelector(`#sold-badge-${idx}`);
    if (soldBadge) {
      soldBadge.innerHTML = `Sold: <b>${soldNorm} ${itemUnitStr}</b> ${soldNorm > 0 ? `<span style="color:#64748b; font-size:11px;">(~${Math.round(soldNorm * 1000)} g)</span>` : ''}`;
    }
    const salesBadge = document.querySelector(`#sales-badge-${idx}`);
    if (salesBadge) {
      salesBadge.textContent = `Expected Sales: ${formatCurrency(line.total_sales)}`;
    }

    // Update batch total badge
    const batchTotalEl = document.querySelector(`#batch-total-${idx}`);
    if (batchTotalEl) {
      if (batches.length === 0) {
        batchTotalEl.textContent = 'Total: 0 kg';
      } else {
        const parts = batches.map((b) => {
          const v = +b.val || 0;
          return b.unit === 'g' || b.unit === 'grams' ? `${v}g` : `${v}kg`;
        });
        batchTotalEl.textContent = `Total: ${totalKg} kg  (${parts.join(' + ')})`;
      }
    }

    refreshClosingTotalsInDOM();
  }

  function addBatch(idx) {
    const dateStr = S.selectedDate;
    if (!S.dailyStock[dateStr]) return;
    const lines = S.dailyStock[dateStr];
    if (!lines || !lines[idx]) return;

    if (!Array.isArray(lines[idx].batches)) lines[idx].batches = [];
    const bi = lines[idx].batches.length;
    lines[idx].batches.push({ val: '', unit: 'g' });
    saveLocal("dailyStock", S.dailyStock);

    // Inject new batch row into DOM without full re-render
    const rowsContainer = document.querySelector(`#batch-rows-${idx}`);
    if (rowsContainer) {
      // Remove "no batches yet" placeholder if present
      const placeholder = rowsContainer.querySelector('div[style*="italic"]');
      if (placeholder) placeholder.remove();

      const row = document.createElement('div');
      row.className = 'batch-row';
      row.id = `batch-row-${idx}-${bi}`;
      row.innerHTML = `
        <span class="batch-row-label">Batch ${bi + 1}</span>
        <input type="number" step="any" min="0" value="" placeholder="0"
          oninput="window.fcp.updateBatch(${idx}, ${bi}, 'val', this.value)">
        <select class="batch-unit-select" onchange="window.fcp.updateBatch(${idx}, ${bi}, 'unit', this.value)">
          <option value="g" selected>grams</option>
          <option value="kg">kg</option>
        </select>
        <button class="remove-batch-btn" onclick="window.fcp.removeBatch(${idx}, ${bi})" title="Remove batch">✕</button>
      `;
      rowsContainer.appendChild(row);
      // Focus the new input
      const newInput = row.querySelector('input');
      if (newInput) setTimeout(() => newInput.focus(), 50);
    }
    _recomputeBatchTotal(idx);
  }

  function updateBatch(idx, batchIdx, field, value) {
    const dateStr = S.selectedDate;
    if (!S.dailyStock[dateStr]) return;
    const lines = S.dailyStock[dateStr];
    if (!lines || !lines[idx]) return;
    if (!Array.isArray(lines[idx].batches)) lines[idx].batches = [];
    if (!lines[idx].batches[batchIdx]) lines[idx].batches[batchIdx] = { val: '', unit: 'g' };

    if (field === 'val') {
      lines[idx].batches[batchIdx].val = value;
    } else if (field === 'unit') {
      lines[idx].batches[batchIdx].unit = value;
    }

    _recomputeBatchTotal(idx);
  }

  function removeBatch(idx, batchIdx) {
    const dateStr = S.selectedDate;
    if (!S.dailyStock[dateStr]) return;
    const lines = S.dailyStock[dateStr];
    if (!lines || !lines[idx]) return;
    if (!Array.isArray(lines[idx].batches)) return;

    lines[idx].batches.splice(batchIdx, 1);
    saveLocal("dailyStock", S.dailyStock);

    // Re-render only the batch rows container to preserve focus on other fields
    const rowsContainer = document.querySelector(`#batch-rows-${idx}`);
    if (rowsContainer) {
      if (lines[idx].batches.length === 0) {
        rowsContainer.innerHTML = `<div style="font-size:12px; color:#9ca3af; text-align:center; padding:8px 0; font-style:italic;">No batches yet — add each batch Dileep weighs 👇</div>`;
      } else {
        rowsContainer.innerHTML = lines[idx].batches.map((b, bi) => `
          <div class="batch-row" id="batch-row-${idx}-${bi}">
            <span class="batch-row-label">Batch ${bi + 1}</span>
            <input type="number" step="any" min="0" value="${b.val || ''}" placeholder="0"
              oninput="window.fcp.updateBatch(${idx}, ${bi}, 'val', this.value)">
            <select class="batch-unit-select" onchange="window.fcp.updateBatch(${idx}, ${bi}, 'unit', this.value)">
              <option value="g" ${(b.unit === 'g' || b.unit === 'grams' || !b.unit) ? 'selected' : ''}>grams</option>
              <option value="kg" ${b.unit === 'kg' ? 'selected' : ''}>kg</option>
            </select>
            <button class="remove-batch-btn" onclick="window.fcp.removeBatch(${idx}, ${bi})" title="Remove batch">✕</button>
          </div>
        `).join('');
      }
    }
    _recomputeBatchTotal(idx);
  }

  function refreshClosingTotalsInDOM() {
    const dateStr = S.selectedDate;
    const stockLines = getStockLinesForDate(dateStr);
    const todayExpenses = (S.expenses || []).filter((e) => e.expense_date === dateStr);
    const closing = getClosingForDate(dateStr);

    const totals = computeDailyTotals(
      stockLines,
      closing.actual_cash_collected,
      closing.actual_upi_collected,
      todayExpenses,
      closing.master_wage
    );

    // 1. Tally Box Update
    const tallyBox = document.querySelector("#tally-box");
    if (tallyBox) {
      tallyBox.className = `tally-box ${totals.cashDifference === 0 ? "tally-matched" : totals.cashDifference < 0 ? "tally-shortage" : "tally-surplus"}`;
      tallyBox.innerHTML = `
        <div>
          <div class="tally-title">
            ${totals.cashDifference === 0 
              ? "🎉 Cash Tally Matched Perfectly!" 
              : totals.cashDifference < 0 
              ? "⚠️ Cash Shortage Detected" 
              : "ℹ️ Cash Surplus / Extra Collected"}
          </div>
          <div style="font-size:12px; margin-top:3px;">
            Expected from Stock: <b>${formatCurrency(totals.expectedSales)}</b> | Actual Collected: <b>${formatCurrency(totals.actualCollected)}</b>
          </div>
        </div>
        <div class="tally-amount">
          ${totals.cashDifference === 0 ? "₹0" : formatCurrency(totals.cashDifference)}
        </div>
      `;
    }

    // 2. Step 3 Purchases Total
    const expTotalEl = document.querySelector("#closing-exp-total");
    if (expTotalEl) {
      expTotalEl.textContent = formatCurrency(totals.totalExpenses - (+closing.master_wage || 0));
    }

    // 3. Step 4 Summary Card
    const totalCollEl = document.querySelector("#closing-total-collected");
    if (totalCollEl) {
      totalCollEl.textContent = formatCurrency(totals.actualCollected);
    }
    const totalExpEl = document.querySelector("#closing-total-expenses");
    if (totalExpEl) {
      totalExpEl.textContent = formatCurrency(totals.totalExpenses);
    }
    const netProfitEl = document.querySelector("#closing-net-profit");
    if (netProfitEl) {
      netProfitEl.textContent = formatCurrency(totals.netProfit);
      netProfitEl.style.color = totals.netProfit >= 0 ? "#4ade80" : "#f87171";
    }
  }

  async function saveAndLockClosing() {
    const dateStr = S.selectedDate;
    const stockLines = getStockLinesForDate(dateStr);
    const todayExpenses = (S.expenses || []).filter((e) => e.expense_date === dateStr);
    const existingClosing = getClosingForDate(dateStr);

    const totals = computeDailyTotals(
      stockLines,
      existingClosing.actual_cash_collected,
      existingClosing.actual_upi_collected,
      todayExpenses,
      existingClosing.master_wage
    );

    const closingRecord = {
      id: existingClosing.id || "closing-" + dateStr,
      closing_date: dateStr,
      total_expected_sales: totals.expectedSales,
      actual_cash_collected: +existingClosing.actual_cash_collected || 0,
      actual_upi_collected: +existingClosing.actual_upi_collected || 0,
      total_revenue: totals.actualCollected,
      total_expenses: totals.totalExpenses,
      net_profit: totals.netProfit,
      cash_difference: totals.cashDifference,
      master_wage: +existingClosing.master_wage || S.masterDailyWage,
      is_closed: true,
      closed_at: new Date().toISOString()
    };

    S.closings[dateStr] = closingRecord;
    saveLocal("closings", S.closings);

    // Save Daily Stock lines locally
    S.dailyStock[dateStr] = totals.stockLines;
    saveLocal("dailyStock", S.dailyStock);

    // Sync to Supabase if connected
    if (db) {
      try {
        await db.from("daily_closings").upsert([closingRecord], { onConflict: "closing_date" });
        const dbLines = totals.stockLines.map((l) => ({
          closing_id: closingRecord.id,
          item_id: l.item_id,
          entry_date: dateStr,
          item_name: l.item_name,
          unit: l.item_unit,
          opening_stock: l.opening_stock,
          marinated_added_stock: l.marinated_added_stock,
          closing_stock: l.closing_stock,
          sold_quantity: l.sold_quantity,
          unit_price: l.unit_price,
          total_sales: l.total_sales
        }));
        await db.from("daily_stock_entries").upsert(dbLines, { onConflict: "entry_date,item_id" });
      } catch (err) {
        console.warn("Supabase closing sync error:", err);
      }
    }

    showToast("🎉 Closing locked! Net Profit and stock carryover saved.");
    navigate("dashboard");
  }

  // --- 1-Day Full Simulation Test Case Loader ---
  function loadDemoData() {
    const today = S.today;

    // 1. Set 1-Day Realistic Morning Expenses
    S.expenses = [
      { id: "demo-exp-1", category: "Raw Chicken Meat", amount: 2400, quantity: "12.0 kg", expense_date: today, payment_method: "Cash", description: "Fresh dressed chicken for pokodi & joints", created_at: new Date().toISOString() },
      { id: "demo-exp-2", category: "Cooking Oil", amount: 1800, quantity: "15 Liters (1 Tin)", expense_date: today, payment_method: "Cash", description: "Refined Sunflower Oil", created_at: new Date().toISOString() },
      { id: "demo-exp-3", category: "Fish & Seafood", amount: 600, quantity: "2.5 kg", expense_date: today, payment_method: "Cash", description: "Cleaned boneless fish cuts", created_at: new Date().toISOString() },
      { id: "demo-exp-4", category: "Spices & Masala Groceries", amount: 450, quantity: "Pack", expense_date: today, payment_method: "Cash", description: "Ginger-garlic, red chilli powder, salt", created_at: new Date().toISOString() },
      { id: "demo-exp-5", category: "Corn Flour & Maida", amount: 300, quantity: "5 kg", expense_date: today, payment_method: "Cash", description: "Corn starch & Maida bags", created_at: new Date().toISOString() },
      { id: "demo-exp-6", category: "Commercial Gas Cylinder", amount: 250, quantity: "Allocated", expense_date: today, payment_method: "Cash", description: "Daily gas usage allocation", created_at: new Date().toISOString() },
      { id: "demo-exp-7", category: "Eggs Crate", amount: 180, quantity: "30 Eggs", expense_date: today, payment_method: "UPI", description: "Farm fresh eggs crate", created_at: new Date().toISOString() }
    ];
    saveLocal("expenses", S.expenses);

    // 2. Set 1-Day Realistic Stock Entries (Weighed by Master Dileep)
    const demoStock = [
      { item_id: "item-chicken-pokodi", item_name: "Chicken pokodi", item_unit: "kg", unit_price: 480, opening_val: 0.500, opening_unit: "kg", added_val: 9.600, added_unit: "kg", closing_val: 0.600, closing_unit: "kg", opening_stock: 0.500, marinated_added_stock: 9.600, closing_stock: 0.600, sold_quantity: 9.500, total_sales: 4560 },
      { item_id: "item-chicken-liver", item_name: "Chicken Liver pokodi", item_unit: "kg", unit_price: 400, opening_val: 0.000, opening_unit: "kg", added_val: 1800, added_unit: "g", closing_val: 300, closing_unit: "g", opening_stock: 0.000, marinated_added_stock: 1.800, closing_stock: 0.300, sold_quantity: 1.500, total_sales: 600 },
      { item_id: "item-chicken-wings", item_name: "Chicken Wings", item_unit: "pieces", unit_price: 20, opening_val: 5, opening_unit: "pieces", added_val: 30, added_unit: "pieces", closing_val: 3, closing_unit: "pieces", opening_stock: 5, marinated_added_stock: 30, closing_stock: 3, sold_quantity: 32, total_sales: 640 },
      { item_id: "item-chicken-full-joint", item_name: "Chicken Full Joint (Leg Piece)", item_unit: "pieces", unit_price: 100, opening_val: 0, opening_unit: "pieces", added_val: 12, added_unit: "pieces", closing_val: 2, closing_unit: "pieces", opening_stock: 0, marinated_added_stock: 12, closing_stock: 2, sold_quantity: 10, total_sales: 1000 },
      { item_id: "item-chicken-half-joint", item_name: "Chicken Half Joint", item_unit: "pieces", unit_price: 50, opening_val: 0, opening_unit: "pieces", added_val: 6, added_unit: "pieces", closing_val: 1, closing_unit: "pieces", opening_stock: 0, marinated_added_stock: 6, closing_stock: 1, sold_quantity: 5, total_sales: 250 },
      { item_id: "item-fish-fry", item_name: "Fish Fry", item_unit: "pieces", unit_price: 40, opening_val: 2, opening_unit: "pieces", added_val: 15, added_unit: "pieces", closing_val: 3, closing_unit: "pieces", opening_stock: 2, marinated_added_stock: 15, closing_stock: 3, sold_quantity: 14, total_sales: 560 },
      { item_id: "item-fish-head", item_name: "Fish Head (Talakaya)", item_unit: "pieces", unit_price: 70, opening_val: 0, opening_unit: "pieces", added_val: 5, added_unit: "pieces", closing_val: 1, closing_unit: "pieces", opening_stock: 0, marinated_added_stock: 5, closing_stock: 1, sold_quantity: 4, total_sales: 280 },
      { item_id: "item-chilli-chicken", item_name: "Chilli Chicken", item_unit: "plates", unit_price: 120, opening_val: 0, opening_unit: "plates", added_val: 8, added_unit: "plates", closing_val: 0, closing_unit: "plates", opening_stock: 0, marinated_added_stock: 8, closing_stock: 0, sold_quantity: 8, total_sales: 960 },
      { item_id: "item-chicken-manchuria", item_name: "Chicken Manchuria", item_unit: "plates", unit_price: 80, opening_val: 0, opening_unit: "plates", added_val: 10, added_unit: "plates", closing_val: 1, closing_unit: "plates", opening_stock: 0, marinated_added_stock: 10, closing_stock: 1, sold_quantity: 9, total_sales: 720 },
      { item_id: "item-veg-manchuria-plate", item_name: "Veg Manchuria (Plate)", item_unit: "plates", unit_price: 60, opening_val: 0, opening_unit: "plates", added_val: 6, added_unit: "plates", closing_val: 0, closing_unit: "plates", opening_stock: 0, marinated_added_stock: 6, closing_stock: 0, sold_quantity: 6, total_sales: 360 },
      { item_id: "item-veg-manchuria-fry", item_name: "Veg Manchuria (Fry)", item_unit: "plates", unit_price: 70, opening_val: 0, opening_unit: "plates", added_val: 4, added_unit: "plates", closing_val: 0, closing_unit: "plates", opening_stock: 0, marinated_added_stock: 4, closing_stock: 0, sold_quantity: 4, total_sales: 280 },
      { item_id: "item-eggs-stock", item_name: "Eggs (All Egg Items / Omelettes / Boiled)", item_unit: "eggs", unit_price: 20, opening_val: 5, opening_unit: "eggs", added_val: 1, added_unit: "crates", closing_val: 5, closing_unit: "eggs", opening_stock: 5, marinated_added_stock: 30, closing_stock: 5, sold_quantity: 30, total_sales: 600 }
    ];
    S.dailyStock[today] = demoStock.map(l => sanitizeStockLine(l));
    saveLocal("dailyStock", S.dailyStock);

    // 3. Set 1-Day Balanced Night Closing Summary
    S.closings[today] = {
      id: "closing-" + today,
      closing_date: today,
      total_expected_sales: 10810,
      actual_cash_collected: 6010,
      actual_upi_collected: 4800,
      total_revenue: 10810,
      total_expenses: 6580,
      net_profit: 4230,
      cash_difference: 0,
      master_wage: 600,
      is_closed: true,
      closed_at: new Date().toISOString()
    };
    saveLocal("closings", S.closings);

    showToast("🧪 1-Day Full Test Case Loaded Successfully!");
    render();
  }

  // --- Authentication Views & Handlers ---
  function renderLogin() {
    return `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-brand">
            <div class="login-brand-icon">🍗</div>
            <div class="login-title">Friends Chicken Pakora</div>
            <div class="login-subtitle">Riyan Fast Foods · Admin & Staff Access</div>
          </div>

          <form class="login-form" onsubmit="window.fcp.handleLogin(event)">
            <div class="form-group">
              <label>Mobile Number</label>
              <input type="tel" id="loginPhone" class="login-input" placeholder="e.g. 7702431524" maxlength="10" required autofocus autocomplete="tel">
            </div>

            <div class="form-group">
              <label>Password</label>
              <input type="password" id="loginPass" class="login-input" placeholder="Enter Password" required autocomplete="current-password">
            </div>

            <button type="submit" class="login-btn">
              🔒 Login to Dashboard
            </button>
          </form>

          <div class="login-footer">
            Friends Chicken Pakora & Fast Foods POS System
          </div>
        </div>
      </div>
    `;
  }

  function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const phone = document.querySelector("#loginPhone")?.value?.trim();
    const pass = document.querySelector("#loginPass")?.value?.trim();

    if (phone === AUTH_CREDENTIALS.phone && pass === AUTH_CREDENTIALS.pass) {
      S.isAuthenticated = true;
      saveLocal("auth_session", {
        is_authenticated: true,
        phone: phone,
        login_at: new Date().toISOString()
      });
      showToast("👋 Welcome to Friends Chicken Pakora!");
      render();
    } else {
      showToast("❌ Invalid Mobile Number or Password!");
    }
  }

  function handleLogout() {
    localStorage.removeItem("fcp_auth_session");
    S.isAuthenticated = false;
    showToast("👋 Logged out successfully");
    render();
  }

  // --- UI Render Router with Error Guard ---
  function render() {
    const appEl = document.querySelector("#app");
    const navEl = document.querySelector("#nav");
    if (!appEl || !navEl) return;

    if (!S.isAuthenticated) {
      appEl.innerHTML = renderLogin();
      navEl.innerHTML = "";
      return;
    }

    if (S.loading) {
      appEl.innerHTML = `
        <div style="text-align:center; padding:50px 20px;">
          <div style="font-size:32px; margin-bottom:12px;">🍗</div>
          <div style="font-size:16px; font-weight:700;">Loading Friends Chicken Pakora data...</div>
        </div>
      `;
      return;
    }

    try {
      switch (S.page) {
        case "closing":
          appEl.innerHTML = renderClosingWizard();
          break;
        case "expenses":
          appEl.innerHTML = renderExpenses();
          break;
        case "menu":
          appEl.innerHTML = renderMenu();
          break;
        case "reports":
          appEl.innerHTML = renderReports();
          break;
        case "dashboard":
        default:
          appEl.innerHTML = renderDashboard();
          break;
      }
      navEl.innerHTML = renderNav();
    } catch (err) {
      console.error("UI Render Exception:", err);
      appEl.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
          <div style="font-size:36px; margin-bottom:10px;">⚠️</div>
          <h3 style="color:#ef4444; margin-bottom:8px;">Something went wrong while rendering</h3>
          <p style="font-size:13px; color:#64748b; margin-bottom:16px;">${esc(err.message)}</p>
          <button class="action-btn green" onclick="window.fcp.resetAppCache()">🔄 Reset Cache & Reload</button>
        </div>
      `;
    }
  }

  // --- Reset Cache Utility ---
  function resetAppCache() {
    localStorage.removeItem("fcp_dailyStock");
    localStorage.removeItem("fcp_closings");
    localStorage.removeItem("fcp_menu_v2");
    location.reload();
  }

  // --- Global API for Inline Event Handlers ---
  window.fcp = {
    go: navigate,
    handleLogin,
    logout: handleLogout,
    changeClosingDate: (d) => {
      S.selectedDate = d;
      render();
    },
    filterMenuCat: (cat) => {
      S.activeMenuCategory = cat;
      render();
    },
    filterExpenseCat: (cat) => {
      S.activeExpenseCategory = cat;
      render();
    },
    filterReportRange: (r) => {
      S.reportRange = r;
      render();
    },
    selectPayOption: (btn, method) => {
      btn.parentElement.querySelectorAll(".pay-opt-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.querySelector("#expPayMethod").value = method;
    },
    openAddExpenseModal,
    openEditExpenseModal,
    toggleChickenBreakdown,
    recalcPakoraKg: recalcExpPakora,
    recalcExpPakora,
    applyChickenBreakdownToStock,
    updateChickenIntake,
    syncChickenPartAdded,
    updateChickenIntakeVal,
    updateChickenIntakeUnit,
    updateChickenIntakeCut,
    recalcChickenPakora,
    saveExpenseEdit,
    openEditItemModal,
    openAddItemModal,
    closeModal,
    saveExpense,
    deleteExpense,
    saveItemEdit,
    saveNewItem,
    updateStockLineValue,
    updateFieldUnit,
    updateClosingField,
    addBatch,
    updateBatch,
    removeBatch,
    saveAndLockClosing,
    loadDemoData,
    openExportModal,
    downloadDayCSV,
    shareDayWhatsApp,
    printDayStatement,
    resetAppCache
  };

  // --- Start Application ---
  initData();
})();
