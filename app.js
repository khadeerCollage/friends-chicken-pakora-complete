// ============================================================================
// Friends Chicken Pakora / Riyan Fast Foods — Master Application Script
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
      id: "item-chicken-pakora",
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

    // Migrate legacy egg items to unified Eggs item
    if (itemId.startsWith("item-omelette-") || itemId === "item-boiled-egg" || itemId.startsWith("item-egg-")) {
      itemId = "item-eggs-stock";
      itemName = "Eggs (All Egg Items / Omelettes / Boiled)";
      rawUnit = "eggs";
      unitPrice = 20;
      priceNote = "₹20 / egg (1 egg = ₹20, 2 eggs = ₹40)";
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

  // --- Application State ---
  const S = {
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

  function getStockLinesForDate(dateStr) {
    const menuMap = {};
    (S.menu || []).forEach((m) => { menuMap[m.id] = m; });

    if (S.dailyStock[dateStr] && S.dailyStock[dateStr].length > 0) {
      // Filter out legacy egg items and ensure item-eggs-stock exists
      let lines = S.dailyStock[dateStr].filter(l => l && !l.item_id.startsWith("item-omelette-") && l.item_id !== "item-boiled-egg" && !(l.item_id.startsWith("item-egg-") && l.item_id !== "item-eggs-stock"));
      if (!lines.some(l => l.item_id === "item-eggs-stock")) {
        lines.push(sanitizeStockLine({
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
      S.dailyStock[dateStr] = lines.map((l) => sanitizeStockLine(l, menuMap[l.item_id]));
      return S.dailyStock[dateStr];
    }

    // Auto-carryover from previous day's closing stock!
    const prevDate = getPreviousDate(dateStr);
    const prevLines = S.dailyStock[prevDate] || [];
    const prevClosingMap = {};
    prevLines.forEach((l) => {
      prevClosingMap[l.item_id] = l.closing_stock || 0;
    });

    const activeItems = (S.menu || DEFAULT_MENU_ITEMS).filter((m) => m.is_active !== false);
    const generated = activeItems.map((item) => {
      const opening = prevClosingMap[item.id] || 0;
      return sanitizeStockLine({
        item_id: item.id,
        item_name: item.name,
        unit: item.unit,
        unit_price: item.price,
        price_note: item.price_note,
        opening_val: opening,
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
      ["closing", "⚡", "Night Closing"],
      ["expenses", "🛒", "Expenses"],
      ["menu", "🍗", "Menu & Rates"],
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
          <div class="brand-title">🍗 ${esc(S.shopName)}</div>
          <div class="brand-sub">Dileep Master Shop Tracker · ${formatDisplayDate(today)}</div>
        </div>
        <div>
          <span class="badge-status ${db ? "badge-online" : "badge-demo"}">
            ${db ? "● Cloud Synced" : "● Offline Local"}
          </span>
        </div>
      </div>

      <!-- Quick 15-Minute Closing Callout -->
      <div class="closing-alert-card">
        <h3>⚡ 15-Minute Daily Night Closing</h3>
        <p>${isClosed ? "✅ Tonight's closing is locked and settled." : "Enter today's mixed weights & count closing cash in 15 mins."}</p>
        <button class="closing-btn" onclick="window.fcp.go('closing')">
          ${isClosed ? "✏️ View / Edit Closing Sheet" : "⚡ Start Night Closing Sheet"}
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

      <!-- Action Buttons & Quick Test Case Loader -->
      <div class="action-row">
        <button class="action-btn green" onclick="window.fcp.openAddExpenseModal()">
          ➕ Add Purchase / Expense
        </button>
        <button class="action-btn dark" onclick="window.fcp.go('menu')">
          🍗 Manage Menu & Rates
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
          <div class="brand-title">⚡ 15-Minute Night Closing Sheet</div>
          <div class="brand-sub">Enter weights in KG or Grams freely — auto-calculates sold & sales</div>
        </div>
        <div>
          <input type="date" value="${dateStr}" id="closingDateInput" onchange="window.fcp.changeClosingDate(this.value)" 
            style="padding:7px 10px; border:1px solid #cbd5e1; border-radius:8px; font-weight:700; font-size:13px; background:#fff;">
        </div>
      </div>

      <!-- Step 1: Stock Entries with Flexible Per-Field KG / Grams Selection -->
      <div class="wizard-card">
        <div class="wizard-step-header">
          <div class="step-number">1</div>
          <div>
            <div class="step-title">Stock Reconciliation & Sales Calculation</div>
            <div class="step-subtitle">Select KG or Grams per field freely · Opening + Added - Closing = Sold</div>
          </div>
        </div>

        <div id="stockLinesContainer">
          ${stockLines.map((line, idx) => {
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
                  <div class="stock-item-price">
                    <span>Rate: ₹</span>
                    <input type="number" step="any" min="1" value="${line.unit_price}" 
                      oninput="window.fcp.updateStockLineValue(${idx}, 'unit_price', this.value)">
                    <span id="rate-unit-label-${idx}">/ ${itemUnitStr}</span>
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
                        📸 Dileep's Ready Pakora Batches (from WhatsApp photos)
                      </div>
                      <span class="batch-total-badge" id="batch-total-${idx}">
                        Total: ${line.added_val > 0 ? line.added_val + ' ' + (line.added_unit || 'kg') : '0 kg'}
                      </span>
                    </div>
                    <div id="batch-rows-${idx}">
                      ${(line.batches && line.batches.length > 0) ? line.batches.map((b, bi) => `
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
                      `).join('') : `
                        <div style="font-size:12px; color:#9ca3af; text-align:center; padding:8px 0; font-style:italic;">
                          No batches yet — add each batch Dileep weighs 👇
                        </div>
                      `}
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
          <div class="brand-sub">Stock items, units (Kg/Pieces/Plates), and default rates</div>
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
        ${list.map(item => `
          <div class="menu-item-card">
            <div class="menu-item-info">
              <h4>${esc(item.name)}</h4>
              <p style="font-size:12px; color:#64748b; margin-top:3px;">
                Unit: <b>${(item.unit || "kg").toUpperCase()}</b> · Category: <b>${item.category}</b>
              </p>
              ${item.price_note ? `<p style="font-size:11px; color:#0284c7; margin-top:2px;">${esc(item.price_note)}</p>` : ""}
            </div>
            <div class="menu-item-right">
              <div class="menu-price">${formatCurrency(item.price)} <span style="font-size:12px; font-weight:600; color:#64748b;">/ ${item.unit || "kg"}</span></div>
              <button class="edit-badge" onclick="window.fcp.openEditItemModal('${item.id}')">✏️ Edit Rate</button>
            </div>
          </div>
        `).join("")}
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
                  <b>📅 ${formatDisplayDate(c.closing_date)}</b>
                  <span class="badge-status ${c.net_profit >= 0 ? "badge-online" : "badge-demo"}">
                    Profit: ${formatCurrency(c.net_profit)}
                  </span>
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
              <select id="expCat" required>
                ${EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Amount (₹) *</label>
              <input type="number" step="any" min="1" id="expAmt" placeholder="e.g. 1500" required autofocus>
            </div>

            <div class="form-group">
              <label>Quantity / Weight (e.g. 15 kg chicken, 2 cans oil)</label>
              <input type="text" id="expQty" placeholder="e.g. 15 kg raw chicken">
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
  }

  // 2. Edit Expense Modal (Direct Edit Support)
  function openEditExpenseModal(expId) {
    const exp = (S.expenses || []).find((e) => e.id === expId);
    if (!exp) return;

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
              <select id="editExpCat" required>
                ${EXPENSE_CATEGORIES.map(c => `<option value="${c}" ${exp.category === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Amount (₹) *</label>
              <input type="number" step="any" min="1" id="editExpAmt" value="${exp.amount}" required autofocus>
            </div>

            <div class="form-group">
              <label>Quantity / Weight (e.g. 15 kg chicken, 2 cans oil)</label>
              <input type="text" id="editExpQty" value="${esc(exp.quantity || "")}" placeholder="e.g. 15 kg raw chicken">
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
      { id: "demo-exp-1", category: "Raw Chicken Meat", amount: 2400, quantity: "12.0 kg", expense_date: today, payment_method: "Cash", description: "Fresh dressed chicken for pakora & joints", created_at: new Date().toISOString() },
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
      { item_id: "item-chicken-pakora", item_name: "Chicken Pakora", item_unit: "kg", unit_price: 480, opening_val: 0.500, opening_unit: "kg", added_val: 9.600, added_unit: "kg", closing_val: 0.600, closing_unit: "kg", opening_stock: 0.500, marinated_added_stock: 9.600, closing_stock: 0.600, sold_quantity: 9.500, total_sales: 4560 },
      { item_id: "item-chicken-liver", item_name: "Chicken Liver Pakora", item_unit: "kg", unit_price: 400, opening_val: 0.000, opening_unit: "kg", added_val: 1800, added_unit: "g", closing_val: 300, closing_unit: "g", opening_stock: 0.000, marinated_added_stock: 1.800, closing_stock: 0.300, sold_quantity: 1.500, total_sales: 600 },
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

  // --- UI Render Router with Error Guard ---
  function render() {
    const appEl = document.querySelector("#app");
    const navEl = document.querySelector("#nav");
    if (!appEl || !navEl) return;

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
    resetAppCache
  };

  // --- Start Application ---
  initData();
})();
