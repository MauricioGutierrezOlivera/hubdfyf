"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

interface Country {
  id: string;
  name: string;
  code: string;
}

interface Store {
  id: string;
  name: string;
  address?: string;
  countryId: string;
  shopifyUrl?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "COUNTRY_ADMIN" | "CLERK";
  countryId: string;
  stores: { store: Store }[];
}

interface ProductVariant {
  id: string;
  size: string;
  quantity: number; // Stock in store
  shopifyId: string;
  price?: number;
  compareAtPrice?: number | null;
}

interface CatalogProduct {
  name: string;
  family: string | null;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  variants: ProductVariant[];
}

interface CartItem {
  productName: string;
  productId: string; // Variant ID
  size: string;
  price: number;
  quantity: number;
  maxStock: number;
  discount: number;
  discountType?: "percent" | "amount";
}

interface Customer {
  id: string;
  name: string;
  rut?: string;
  email?: string;
  phone?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AppContainer() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [activeTab, setActiveTab] = useState<"pos" | "admin" | "returns" | "customers" | "reports" | "analytics" | "styles" | "stock">("pos");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Login States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [tempUserToLogin, setTempUserToLogin] = useState<User | null>(null);

  // POS Catalog States
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string>("Todas");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // POS Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [generalDiscountType, setGeneralDiscountType] = useState<"percent" | "amount">("amount");
  const [saleNotes, setSaleNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [paymentBank, setPaymentBank] = useState("");
  const [isRegisteringSale, setIsRegisteringSale] = useState(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState("");
  const [saleErrorMessage, setSaleErrorMessage] = useState("");
  
  // Sale Result Popup Modal States
  const [showSaleResultModal, setShowSaleResultModal] = useState(false);
  const [saleResultStatus, setSaleResultStatus] = useState<"success" | "warning" | "error" | null>(null);
  const [saleResultMessage, setSaleResultMessage] = useState("");
  const [shopifyStockStatus, setShopifyStockStatus] = useState<"success" | "error" | null>(null);

  // Customer/CRM POS Identification States
  const [searchCustomerQuery, setSearchCustomerQuery] = useState("");
  const [identifiedCustomer, setIdentifiedCustomer] = useState<Customer | null>(null);
  const [customerSearchError, setCustomerSearchError] = useState("");
  
  // Create Customer States (Inside POS)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [searchCustomerResults, setSearchCustomerResults] = useState<Customer[]>([]);
  const [newCustName, setNewCustName] = useState("");
  const [newCustLastName, setNewCustLastName] = useState("");
  const [newCustRut, setNewCustRut] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustError, setNewCustError] = useState("");

  // Customers List and Filters States
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterRut, setFilterRut] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [selectedCustomerSizes, setSelectedCustomerSizes] = useState<string[]>([]);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);

  // Email Export Modal States (Admin only)
  const [isEmailExportModalOpen, setIsEmailExportModalOpen] = useState(false);
  const [copiedEmailStatus, setCopiedEmailStatus] = useState(false);

  // Customers Sorting and Edit Modal States
  const [sortField, setSortField] = useState<"zapatosComprados" | "fechaUltimaCompra" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editRut, setEditRut] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // New Customer Modal States
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerRut, setNewCustomerRut] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isSavingNewCustomer, setIsSavingNewCustomer] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  // Delete Customer Modal States
  const [deletingCustomer, setDeletingCustomer] = useState<any | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [deleteCustomerError, setDeleteCustomerError] = useState<string | null>(null);

  // Sales Report States
  const [isSellerRevenueModalOpen, setIsSellerRevenueModalOpen] = useState(false);

  // Stock Matrix Search State
  const [stockModelSearchQuery, setStockModelSearchQuery] = useState("");

  // Bulk Price Adjustment Modal States
  const [isAdjustPriceModalOpen, setIsAdjustPriceModalOpen] = useState(false);
  const [selectedDiscountPercent, setSelectedDiscountPercent] = useState<number | "">("");
  const [customShopifyTag, setCustomShopifyTag] = useState("");
  const [isApplyingPriceAdjustment, setIsApplyingPriceAdjustment] = useState(false);
  const [priceAdjustmentResult, setPriceAdjustmentResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingOnlineOrders, setIsSyncingOnlineOrders] = useState(false);

  // Returns / Exchanges States
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState("");
  const [exchangeCustomer, setExchangeCustomer] = useState<Customer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [selectedReturnItem, setSelectedReturnItem] = useState<any | null>(null);
  const [exchangeCustomerSearchResults, setExchangeCustomerSearchResults] = useState<any[]>([]);
  const [isCustomerSearchPopupOpen, setIsCustomerSearchPopupOpen] = useState(false);
  const [selectedExchangeItems, setSelectedExchangeItems] = useState<any[]>([]);
  const [showExchangeCatalogPopup, setShowExchangeCatalogPopup] = useState(false);
  const [exchangeCatalogSearchQuery, setExchangeCatalogSearchQuery] = useState("");
  const [exchangePaymentMethod, setExchangePaymentMethod] = useState("EFECTIVO");
  const [operationMode, setOperationMode] = useState<"EXCHANGE" | "REFUND" | null>(null);
  const [isProcessingExchange, setIsProcessingExchange] = useState(false);

  // Reports Screen States
  const [reportsSubTab, setReportsSubTab] = useState<"metrics" | "sales">("metrics");
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportSortOrder, setReportSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedSellersFilter, setSelectedSellersFilter] = useState<string[]>([]);
  const [isSellerFilterOpen, setIsSellerFilterOpen] = useState<boolean>(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isLoadingSaleDetail, setIsLoadingSaleDetail] = useState<boolean>(false);

  // Edit Sale States
  const [isEditingSale, setIsEditingSale] = useState<boolean>(false);
  const [editDate, setEditDate] = useState<string>("");
  const [editVendedor, setEditVendedor] = useState<string>("");
  const [editChannel, setEditChannel] = useState<string>("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>("");
  const [editPaymentBank, setEditPaymentBank] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editItems, setEditItems] = useState<any[]>([]);
  const [isSavingSaleEdit, setIsSavingSaleEdit] = useState<boolean>(false);
  const [isDeletingSale, setIsDeletingSale] = useState<boolean>(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");

  // Analytics Screen States
  const [analyticsFromYear, setAnalyticsFromYear] = useState<number>(2025);
  const [analyticsFromMonth, setAnalyticsFromMonth] = useState<number>(1);
  const [analyticsToYear, setAnalyticsToYear] = useState<number>(new Date().getFullYear());
  const [analyticsToMonth, setAnalyticsToMonth] = useState<number>(new Date().getMonth() + 1);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [hoveredAnalyticsMonth, setHoveredAnalyticsMonth] = useState<number | null>(null);

  // Style Report States (Admin Only)
  const [styleReportData, setStyleReportData] = useState<any>(null);
  const [isLoadingStyleReport, setIsLoadingStyleReport] = useState<boolean>(false);
  const [stylePeriodMode, setStylePeriodMode] = useState<"ALL" | "FILTER">("ALL");

  // Stock Report States (Admin Only)
  const [stockReportData, setStockReportData] = useState<any>(null);
  const [isLoadingStockReport, setIsLoadingStockReport] = useState<boolean>(false);
  const [stockViewMode, setStockViewMode] = useState<"TOTAL" | "BY_STYLE" | "BY_MODEL">("TOTAL");
  const [selectedStockStyles, setSelectedStockStyles] = useState<string[]>([]);
  const [isStockStyleDropdownOpen, setIsStockStyleDropdownOpen] = useState<boolean>(false);
  const [selectedStockDiscounts, setSelectedStockDiscounts] = useState<number[]>([]);
  const [selectedStockQtys, setSelectedStockQtys] = useState<number[]>([]);
  const [isStockDiscountDropdownOpen, setIsStockDiscountDropdownOpen] = useState<boolean>(false);
  const [isStockQtyDropdownOpen, setIsStockQtyDropdownOpen] = useState<boolean>(false);
  const [stockDropdownPos, setStockDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [stockSortColumn, setStockSortColumn] = useState<string>("total");
  const [stockSortDir, setStockSortDir] = useState<"asc" | "desc">("desc");

  const openStockDropdown = (type: "style" | "discount" | "qty", e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = type === "qty" ? 240 : 256;
    const calculatedLeft = Math.max(16, Math.min(rect.left - 40, window.innerWidth - menuWidth - 16));
    
    setStockDropdownPos({
      top: rect.bottom + 8,
      left: calculatedLeft,
    });

    if (type === "style") {
      setIsStockStyleDropdownOpen(!isStockStyleDropdownOpen);
      setIsStockDiscountDropdownOpen(false);
      setIsStockQtyDropdownOpen(false);
    } else if (type === "discount") {
      setIsStockDiscountDropdownOpen(!isStockDiscountDropdownOpen);
      setIsStockStyleDropdownOpen(false);
      setIsStockQtyDropdownOpen(false);
    } else if (type === "qty") {
      setIsStockQtyDropdownOpen(!isStockQtyDropdownOpen);
      setIsStockStyleDropdownOpen(false);
      setIsStockDiscountDropdownOpen(false);
    }
  };

  // Admin Section States
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  
  // User Creation/Editing States
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"COUNTRY_ADMIN" | "CLERK">("CLERK");
  const [newUserCountryId, setNewUserCountryId] = useState("");
  const [newUserStoreIds, setNewUserStoreIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState("");
  const [userActionSuccess, setUserActionSuccess] = useState("");

  // Store Creation States
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const [newStoreCountryId, setNewStoreCountryId] = useState("");
  const [newStoreShopifyUrl, setNewStoreShopifyUrl] = useState("");
  const [newStoreShopifyClientId, setNewStoreShopifyClientId] = useState("");
  const [newStoreShopifyClientSecret, setNewStoreShopifyClientSecret] = useState("");
  const [storeActionError, setStoreActionError] = useState("");
  const [storeActionSuccess, setStoreActionSuccess] = useState("");

  useEffect(() => {
    // Theme setup
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Restore session
    const savedUser = localStorage.getItem("dfyf_user");
    const savedStore = localStorage.getItem("dfyf_store");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    if (savedStore) {
      setActiveStore(JSON.parse(savedStore));
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      const fetchUsers = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/users`);
          if (res.ok) {
            const data = await res.json();
            setUsersList(data);
            if (data.length > 0 && !loginEmail) {
              setLoginEmail(data[0].email);
            }
          }
        } catch (e) {
          console.error("Failed to fetch users", e);
        }
      };
      fetchUsers();
    }
  }, [currentUser]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load Catalog based on active Store
  const fetchCatalog = async () => {
    if (!currentUser || !activeStore) return;
    setIsLoadingCatalog(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/pos-catalog`, {
        headers: {
          "x-user-id": currentUser.id,
          "x-store-id": activeStore.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCatalog(data);
      }
    } catch (e) {
      console.error("Error loading catalog:", e);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Return/Exchange operations helper functions
  const handleCustomerSearch = async () => {
    if (!exchangeSearchQuery.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/search?query=${encodeURIComponent(exchangeSearchQuery.trim())}`, {
        headers: { "x-user-id": currentUser?.id || "" }
      });
      if (!res.ok) {
        throw new Error("Error al buscar clientas");
      }
      const data = await res.json();
      setExchangeCustomerSearchResults(data);
      if (data.length === 0) {
        alert("No se encontraron clientas con ese nombre o correo.");
      } else if (data.length === 1) {
        selectExchangeCustomer(data[0]);
      } else {
        setIsCustomerSearchPopupOpen(true);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const selectExchangeCustomer = async (customer: any) => {
    setExchangeCustomer(customer);
    setIsCustomerSearchPopupOpen(false);
    setPurchaseHistory([]);
    setSelectedReturnItem(null);
    setSelectedExchangeItems([]);
    setOperationMode(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sales/customer/${customer.id}`, {
        headers: { "x-user-id": currentUser?.id || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setPurchaseHistory(data);
      }
    } catch (e: any) {
      console.error("Error loading purchase history:", e);
    }
  };

  const submitExchangeOrRefund = async () => {
    if (!exchangeCustomer || !selectedReturnItem) return;
    if (operationMode === "EXCHANGE" && selectedExchangeItems.length === 0) {
      alert("Por favor, selecciona al menos un calzado a llevar.");
      return;
    }
    
    if (operationMode === "REFUND") {
      const saleDate = new Date(selectedReturnItem.saleDate);
      const daysDiff = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      const isOffline = selectedReturnItem.saleChannel === "OFFLINE";
      const returnEligible = !isOffline && daysDiff <= 10;
      
      const confirmMsg = isOffline 
        ? "⚠️ Esta compra fue presencial en tienda física (sin reembolso oficial según política). ¿Deseas hacer una excepción y devolver el dinero?"
        : !returnEligible
          ? `⚠️ Se superó el plazo de 10 días (${daysDiff} días transcurridos). ¿Deseas hacer una excepción y devolver el dinero de todas formas?`
          : "¿Estás seguro de procesar la devolución y reembolso de este calzado? El stock reingresará a la bodega.";
          
      const proceed = confirm(confirmMsg);
      if (!proceed) return;
    }

    if (operationMode === "EXCHANGE") {
      const returnAmount = selectedReturnItem.pricePaid;
      const newItemsTotal = selectedExchangeItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
      const diff = newItemsTotal - returnAmount;
      if (diff < 0) {
        const proceed = confirm(`⚠️ Atención: El monto de los nuevos calzados ($${newItemsTotal.toLocaleString("es-CL")}) es inferior al calzado devuelto ($${returnAmount.toLocaleString("es-CL")}).\n\n¿Estás segura de continuar? La clienta perderá la diferencia de $${Math.abs(diff).toLocaleString("es-CL")}, ya que en un cambio no se devuelve dinero.`);
        if (!proceed) return;
      }
    }

    setIsProcessingExchange(true);
    try {
      const returnAmount = selectedReturnItem.pricePaid;
      const newItemsTotal = selectedExchangeItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
      const diff = newItemsTotal - returnAmount;

      const body = {
        customerId: exchangeCustomer.id,
        type: "EXCHANGE",
        notes: operationMode === "REFUND"
          ? `Devolución de dinero: Reingreso de ${selectedReturnItem.productName} (Talla ${selectedReturnItem.size}) de la venta original #${selectedReturnItem.saleId.slice(0, 8)}`
          : `Cambio: Reingreso de ${selectedReturnItem.productName} (Talla ${selectedReturnItem.size}) de la venta original #${selectedReturnItem.saleId.slice(0, 8)} por ${selectedExchangeItems.map(x => `${x.quantity}x ${x.productName} (Talla ${x.size})`).join(', ')}`,
        vendedor: currentUser?.name || "Vendedor",
        channel: "OFFLINE",
        paymentMethod: operationMode === "REFUND"
          ? exchangePaymentMethod
          : diff > 0 ? exchangePaymentMethod : "EFECTIVO",
        items: [
          {
            productId: selectedReturnItem.productId,
            quantity: -1,
            price: selectedReturnItem.pricePaid,
            discount: 0,
          },
          ...(operationMode === "EXCHANGE" ? selectedExchangeItems.map(it => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            discount: 0,
          })) : [])
        ]
      };

      const res = await fetch(`${API_BASE_URL}/admin/sales`, {
        method: "POST",
        headers: {
          "x-user-id": currentUser?.id || "",
          "x-store-id": activeStore?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al procesar la operación");
      }

      alert(operationMode === "REFUND"
        ? "¡Devolución y reembolso procesados con éxito! El inventario ha sido actualizado en Shopify y en el sistema."
        : "¡Cambio de calzados confirmado con éxito! El inventario ha sido actualizado en Shopify y en el sistema."
      );

      setExchangeCustomer(null);
      setPurchaseHistory([]);
      setSelectedReturnItem(null);
      setSelectedExchangeItems([]);
      setOperationMode(null);
      setExchangeSearchQuery("");
      fetchCatalog();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessingExchange(false);
    }
  };

  const fetchCustomersList = async () => {
    if (!currentUser) return;
    setIsLoadingCustomers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers`, {
        headers: {
          "x-user-id": currentUser.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomersList(data);
      }
    } catch (e) {
      console.error("Error loading customers:", e);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const fetchReportData = async () => {
    if (!currentUser || !activeStore) return;
    setIsLoadingReport(true);
    try {
      const isAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "COUNTRY_ADMIN";
      const now = new Date();
      const yearToUse = !isAdmin ? now.getFullYear() : reportYear;
      const monthToUse = !isAdmin ? (now.getMonth() + 1) : reportMonth;

      const monthQuery = monthToUse > 0 ? `&month=${monthToUse}` : "";
      const res = await fetch(`${API_BASE_URL}/admin/reports/sales?year=${yearToUse}${monthQuery}`, {
        headers: {
          "x-user-id": currentUser.id,
          "x-store-id": activeStore.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error("Error loading sales report:", e);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const fetchSaleDetail = async (saleId: string) => {
    if (!currentUser || !activeStore) return;
    setIsLoadingSaleDetail(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sales/${saleId}`, {
        headers: {
          "x-user-id": currentUser.id,
          "x-store-id": activeStore.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedSaleDetail(data);
      }
    } catch (e) {
      console.error("Error loading sale detail:", e);
    } finally {
      setIsLoadingSaleDetail(false);
    }
  };

  const startEditingSale = (sale: any) => {
    const d = new Date(sale.date);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    
    setEditDate(localISOTime);
    setEditVendedor(sale.vendedor || "");
    setEditChannel(sale.channel || "OFFLINE");
    setEditPaymentMethod(sale.paymentMethod || "Efectivo");
    setEditPaymentBank(sale.paymentBank || "");
    setEditNotes(sale.notes || "");
    setEditCustomer(sale.customer || null);
    setEditItems(
      (sale.items || []).map((i: any) => ({
        id: i.id,
        price: i.price,
        discount: i.discount || 0,
        quantity: i.quantity,
        productName: i.product?.name || "Producto",
        productSize: i.product?.size || "N/A",
      }))
    );
    setIsEditingSale(true);
  };

  const handleSaveSaleEdit = async () => {
    if (!selectedSaleDetail || !currentUser) return;
    setIsSavingSaleEdit(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sales/${selectedSaleDetail.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          date: new Date(editDate).toISOString(),
          vendedor: editVendedor,
          channel: editChannel,
          paymentMethod: editPaymentMethod,
          paymentBank: editPaymentBank,
          notes: editNotes,
          customerId: editCustomer ? editCustomer.id : null,
          items: editItems,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedSaleDetail(updated);
        setIsEditingSale(false);
        fetchReportData();
        fetchAnalyticsData();
      } else {
        alert("Error al actualizar la transacción");
      }
    } catch (e) {
      console.error("Error updating sale:", e);
      alert("Error al conectarse con el servidor");
    } finally {
      setIsSavingSaleEdit(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!selectedSaleDetail || !currentUser) return;
    if (!confirm("⚠️ ¿Estás seguro de que deseas eliminar de forma permanente esta transacción? El stock de los productos será restaurado en la tienda y en Shopify.")) {
      return;
    }

    setIsDeletingSale(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sales/${selectedSaleDetail.id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": currentUser.id,
        },
      });

      if (res.ok) {
        alert("Transacción eliminada con éxito y stock restaurado.");
        setSelectedSaleDetail(null);
        setIsEditingSale(false);
        fetchReportData();
        fetchAnalyticsData();
      } else {
        const err = await res.json();
        alert(err.message || "Error al eliminar la transacción");
      }
    } catch (e) {
      console.error("Error deleting sale:", e);
      alert("Error al conectarse con el servidor");
    } finally {
      setIsDeletingSale(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reports" && currentUser && activeStore) {
      setSelectedSellersFilter([]);
      setIsSellerFilterOpen(false);
      const isAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "COUNTRY_ADMIN";
      if (!isAdmin) {
        const now = new Date();
        setReportYear(now.getFullYear());
        setReportMonth(now.getMonth() + 1);
      }
      fetchReportData();
    }
  }, [activeTab, reportYear, reportMonth, activeStore]);

  const fetchAnalyticsData = async () => {
    if (!currentUser || !activeStore) return;
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/reports/analytics?fromYear=${analyticsFromYear}&fromMonth=${analyticsFromMonth}&toYear=${analyticsToYear}&toMonth=${analyticsToMonth}`,
        {
          headers: {
            "x-user-id": currentUser.id,
            "x-store-id": activeStore.id,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (e) {
      console.error("Error loading analytics report:", e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === "analytics" && currentUser && activeStore) {
      fetchAnalyticsData();
    }
  }, [activeTab, analyticsFromYear, analyticsFromMonth, analyticsToYear, analyticsToMonth, activeStore]);

  const fetchStyleReport = async () => {
    if (!currentUser || !activeStore || currentUser.role === "CLERK") return;
    setIsLoadingStyleReport(true);
    try {
      let url = `${API_BASE_URL}/admin/reports/styles`;
      if (stylePeriodMode === "FILTER") {
        const query = new URLSearchParams({
          fromYear: analyticsFromYear.toString(),
          fromMonth: analyticsFromMonth.toString(),
          toYear: analyticsToYear.toString(),
          toMonth: analyticsToMonth.toString(),
        });
        url += `?${query.toString()}`;
      }
      const res = await fetch(url, {
        headers: {
          "x-user-id": currentUser.id,
          "x-store-id": activeStore.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStyleReportData(data);
      }
    } catch (e) {
      console.error("Error loading style report:", e);
    } finally {
      setIsLoadingStyleReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === "styles" && currentUser && activeStore && currentUser.role !== "CLERK") {
      fetchStyleReport();
    }
  }, [activeTab, stylePeriodMode, analyticsFromYear, analyticsFromMonth, analyticsToYear, analyticsToMonth, activeStore, currentUser]);

  const fetchStockReport = async () => {
    if (!currentUser || !activeStore || currentUser.role === "CLERK") return;
    setIsLoadingStockReport(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/inventory`, {
        headers: {
          "x-user-id": currentUser.id,
          "x-store-id": activeStore.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStockReportData(data);
      }
    } catch (e) {
      console.error("Error loading stock report:", e);
    } finally {
      setIsLoadingStockReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === "stock" && currentUser && activeStore && currentUser.role !== "CLERK") {
      fetchStockReport();
    }
  }, [activeTab, activeStore, currentUser]);

  // Fetch admin metadata
  const fetchAdminData = async (user: User) => {
    try {
      const headers = { "x-user-id": user.id };
      
      const [usersRes, storesRes, countriesRes] = await Promise.all([
        user.role !== "CLERK" ? fetch(`${API_BASE_URL}/admin/users`, { headers }) : Promise.resolve(null),
        fetch(`${API_BASE_URL}/admin/stores`, { headers }),
        fetch(`${API_BASE_URL}/admin/countries`),
      ]);

      if (usersRes?.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData);
      }
      if (countriesRes.ok) {
        const countriesData = await countriesRes.json();
        setCountries(countriesData);
        if (countriesData.length > 0) {
          setNewUserCountryId(countriesData[0].id);
          setNewStoreCountryId(countriesData[0].id);
        }
      }
    } catch (e) {
      console.error("Error loading admin data:", e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAdminData(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && activeStore) {
      fetchCatalog();
    }
  }, [currentUser, activeStore]);

  useEffect(() => {
    if (currentUser && activeTab === "customers") {
      fetchCustomersList();
    }
  }, [currentUser, activeTab]);

  // Auth: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Usuario o contraseña inválidos");
      }

      const userData: User = await res.json();
      
      // If logging in with the default password, force a password change
      if (loginPassword === "12345678") {
        setTempUserToLogin(userData);
        setShowChangePasswordModal(true);
      } else {
        setCurrentUser(userData);
        localStorage.setItem("dfyf_user", JSON.stringify(userData));

        if (userData.stores && userData.stores.length === 1) {
          const singleStore = userData.stores[0].store;
          setActiveStore(singleStore);
          localStorage.setItem("dfyf_store", JSON.stringify(singleStore));
        }
      }
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");
    
    if (!newPassword) {
      setChangePasswordError("La nueva contraseña no puede estar vacía.");
      return;
    }
    
    if (newPassword === "12345678") {
      setChangePasswordError("No puedes usar la contraseña por defecto. Elige una nueva.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("Las contraseñas no coinciden.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempUserToLogin?.email, newPassword }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Error al actualizar la contraseña");
      }

      const updatedUser: User = await res.json();
      const userStores = updatedUser.stores || tempUserToLogin?.stores || [];
      const userWithStores = { ...updatedUser, stores: userStores };

      // Successfully changed password! Log them in now
      setCurrentUser(userWithStores);
      localStorage.setItem("dfyf_user", JSON.stringify(userWithStores));

      if (userStores.length === 1) {
        const singleStore = userStores[0].store;
        setActiveStore(singleStore);
        localStorage.setItem("dfyf_store", JSON.stringify(singleStore));
      }

      // Reset states
      setShowChangePasswordModal(false);
      setTempUserToLogin(null);
      setNewPassword("");
      setConfirmNewPassword("");
      setLoginPassword("");
    } catch (err: any) {
      setChangePasswordError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveStore(null);
    localStorage.removeItem("dfyf_user");
    localStorage.removeItem("dfyf_store");
    setLoginEmail("");
    setLoginPassword("");
    setCart([]);
  };

  // POS: Add item to cart
  const addToCart = (productName: string, variant: ProductVariant, price: number) => {
    const existing = cart.find((item) => item.productId === variant.id);
    if (existing) {
      if (existing.quantity >= variant.quantity) {
        alert(`No hay suficiente stock en esta tienda. Máximo disponible: ${variant.quantity}`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.productId === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      if (variant.quantity <= 0) {
        alert("Este calzado no cuenta con stock en esta sucursal");
        return;
      }
      setCart([
        ...cart,
        {
          productName,
          productId: variant.id,
          size: variant.size,
          price,
          quantity: 1,
          maxStock: variant.quantity,
          discount: 0,
          discountType: "percent",
        },
      ]);
    }
  };

  const updateItemDiscountType = (productId: string, type: "percent" | "amount") => {
    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, discountType: type, discount: 0 } : item
      )
    );
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, discount: Math.max(0, discount) } : item
      )
    );
  };

  const updateCartQuantity = (productId: string, amount: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    const newQty = item.quantity + amount;

    // Handle returned/exchange items (negative quantities)
    if (item.quantity < 0) {
      if (newQty === 0) {
        setCart(cart.filter((i) => i.productId !== productId));
      } else {
        setCart(cart.map((i) => (i.productId === productId ? { ...i, quantity: newQty } : i)));
      }
      return;
    }

    if (newQty <= 0) {
      setCart(cart.filter((i) => i.productId !== productId));
    } else if (newQty > item.maxStock) {
      alert(`No puedes exceder el stock disponible de la tienda (${item.maxStock} unidades)`);
    } else {
      setCart(cart.map((i) => (i.productId === productId ? { ...i, quantity: newQty } : i)));
    }
  };

  // POS: Search CRM client
  const handleSearchCustomer = async () => {
    setCustomerSearchError("");
    setIdentifiedCustomer(null);
    setSearchCustomerResults([]);
    if (!searchCustomerQuery) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/search?query=${encodeURIComponent(searchCustomerQuery)}`, {
        headers: { "x-user-id": currentUser?.id || "" }
      });
      if (!res.ok) {
        throw new Error("Error en la búsqueda");
      }
      const data = await res.json();
      if (data && data.length === 1) {
        setIdentifiedCustomer(data[0]); // Unique match
      } else if (data && data.length > 1) {
        setSearchCustomerResults(data);
        setIsCustomerListOpen(true); // Open selector modal
      } else {
        setCustomerSearchError("Cliente no encontrado en el CRM");
      }
    } catch (e) {
      setCustomerSearchError("Error al buscar cliente en el CRM");
    }
  };

  const handleSaveCustomer = async () => {
    setNewCustError("");
    setIsCreatingCustomer(true);
    
    if (!newCustName || !newCustLastName) {
      setNewCustError("El nombre y apellido son obligatorios.");
      setIsCreatingCustomer(false);
      return;
    }

    try {
      const fullName = `${newCustName.trim()} ${newCustLastName.trim()}`;
      const res = await fetch(`${API_BASE_URL}/admin/customers`, {
        method: "POST",
        headers: {
          "x-user-id": currentUser?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName,
          rut: newCustRut || undefined,
          email: newCustEmail || undefined,
          phone: newCustPhone || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear el cliente");
      }

      const newCustomer = await res.json();
      setIdentifiedCustomer(newCustomer); // Select newly created customer
      
      // Close modal and reset fields
      setIsNewCustomerOpen(false);
      setNewCustName("");
      setNewCustLastName("");
      setNewCustRut("");
      setNewCustEmail("");
      setNewCustPhone("");
    } catch (e: any) {
      setNewCustError(e.message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // POS: Register Sale in API
  const handleRegisterSale = async () => {
    if (cart.length === 0) {
      alert("El carro está vacío");
      return;
    }

    setIsRegisteringSale(true);
    setSaleSuccessMessage("");
    setSaleErrorMessage("");

    try {
      const actualGeneralDiscount = getActualGeneralDiscount();
      const res = await fetch(`${API_BASE_URL}/admin/sales`, {
        method: "POST",
        headers: {
          "x-user-id": currentUser?.id || "",
          "x-store-id": activeStore?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: identifiedCustomer?.id || null,
          type: "NORMAL",
          notes: saleNotes,
          vendedor: currentUser?.name || "Vendedor",
          channel: "OFFLINE",
          paymentMethod,
          paymentBank,
          items: (() => {
            const totalGeneralDiscount = actualGeneralDiscount;
            const subtotalBase = cart.reduce((sum, item) => sum + (item.price * Math.abs(item.quantity)), 0);
            
            return cart.map((item) => {
              const itemDiscount = getActualItemDiscount(item);
              let generalDiscountShare = 0;
              if (totalGeneralDiscount > 0 && subtotalBase > 0) {
                const itemWeight = (item.price * Math.abs(item.quantity)) / subtotalBase;
                generalDiscountShare = (totalGeneralDiscount * itemWeight) / Math.abs(item.quantity);
              }
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                discount: Math.min(item.price, itemDiscount + generalDiscountShare),
              };
            });
          })(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al registrar la venta");
      }

      const resData = await res.json();
      const isShopifySyncSuccess = resData.shopifySync?.success ?? true;

      // Reset cart and inputs
      setCart([]);
      setSaleNotes("");
      setIdentifiedCustomer(null);
      setSearchCustomerQuery("");
      setDiscountAmount(0);
      fetchCatalog(); // Refresh active store stock

      // Set up and open Sale Result Popup Modal
      setSaleResultStatus(isShopifySyncSuccess ? "success" : "warning");
      setSaleResultMessage(
        isShopifySyncSuccess 
          ? "Venta registrada con éxito." 
          : "Venta registrada localmente en la base de datos."
      );
      setShopifyStockStatus(isShopifySyncSuccess ? "success" : "error");
      setShowSaleResultModal(true);

    } catch (e: any) {
      setSaleResultStatus("error");
      setSaleResultMessage(e.message || "Ocurrió un error al intentar procesar la venta.");
      setShopifyStockStatus("error");
      setShowSaleResultModal(true);
    } finally {
      setIsRegisteringSale(false);
    }
  };

  // Admin: Create or Edit User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError("");
    setUserActionSuccess("");

    if (!newUserName || !newUserEmail) {
      setUserActionError("Por favor completa los campos Nombre y Email");
      return;
    }

    if (!editingUserId && !newUserPassword) {
      setUserActionError("Por favor ingresa una contraseña para el nuevo usuario");
      return;
    }

    try {
      const url = editingUserId 
        ? `${API_BASE_URL}/admin/users/${editingUserId}`
        : `${API_BASE_URL}/admin/users`;
        
      const method = editingUserId ? "PUT" : "POST";

      const bodyData: any = {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        countryId: newUserCountryId,
        storeIds: newUserStoreIds,
      };

      if (newUserPassword) {
        bodyData.password = newUserPassword;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "x-user-id": currentUser?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Error al ${editingUserId ? 'editar' : 'crear'} usuario`);
      }

      setUserActionSuccess(editingUserId ? "Usuario actualizado correctamente" : "Usuario creado correctamente");
      
      // Reset form states
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserStoreIds([]);
      setEditingUserId(null);
      
      if (currentUser) fetchAdminData(currentUser);
    } catch (err: any) {
      setUserActionError(err.message);
    }
  };

  const handleEditUserClick = (user: any) => {
    setUserActionError("");
    setUserActionSuccess("");
    setEditingUserId(user.id);
    setNewUserName(user.name);
    setNewUserEmail(user.email);
    setNewUserPassword(""); // leave password empty to not change it unless filled!
    setNewUserRole(user.role);
    setNewUserCountryId(user.countryId || "");
    setNewUserStoreIds(user.stores?.map((s: any) => s.storeId) || []);
  };

  // Admin: Create Store
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreActionError("");
    setStoreActionSuccess("");

    if (!newStoreName) {
      setStoreActionError("Por favor ingresa el nombre de la tienda");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/stores`, {
        method: "POST",
        headers: {
          "x-user-id": currentUser?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newStoreName,
          address: newStoreAddress,
          countryId: newStoreCountryId,
          shopifyUrl: newStoreShopifyUrl,
          shopifyClientId: newStoreShopifyClientId,
          shopifyClientSecret: newStoreShopifyClientSecret,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear tienda");
      }

      setStoreActionSuccess("Tienda creada exitosamente");
      setNewStoreName("");
      setNewStoreAddress("");
      setNewStoreShopifyUrl("");
      setNewStoreShopifyClientId("");
      setNewStoreShopifyClientSecret("");
      
      if (currentUser) fetchAdminData(currentUser);
    } catch (err: any) {
      setStoreActionError(err.message);
    }
  };

  // Calculate totals
  const getActualItemDiscount = (item: CartItem) => {
    if (item.discountType === "percent") {
      return Math.round(item.price * ((item.discount || 0) / 100));
    }
    return item.discount || 0;
  };

  const getActualGeneralDiscount = () => {
    if (generalDiscountType === "percent") {
      return Math.round(subtotal * ((discountAmount || 0) / 100));
    }
    return discountAmount || 0;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * Math.abs(item.quantity), 0);
  const productDiscounts = cart.reduce((sum, item) => sum + getActualItemDiscount(item) * Math.abs(item.quantity), 0);
  const actualGeneralDiscount = getActualGeneralDiscount();
  const total = Math.max(0, subtotal - productDiscounts - actualGeneralDiscount);

  // Filter catalog
  const filteredCatalog = catalog.filter((product) => {
    return product.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // View 1: Login Screen
  if (!currentUser) {
    if (showChangePasswordModal) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB] dark:bg-[#022c20] transition-colors duration-200 ${isDarkMode ? "dark" : ""}`}>
          <div className="w-full max-w-md bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 shadow-xl flex flex-col items-center">
            <Image src="/logo.png" alt="DFYF Logo" width={180} height={180} className="object-contain mb-8" priority />
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 text-center">Actualizar Contraseña</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              Has ingresado con la contraseña por defecto. Por seguridad, por favor define tu contraseña personal para futuros accesos.
            </p>

            <form onSubmit={handleChangePassword} className="w-full space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5 uppercase tracking-wider">Nueva Contraseña</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Elige una clave segura" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#055740] bg-[#F9FAFB] dark:bg-[#044c38] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dfyf-green transition-all font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5 uppercase tracking-wider">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repite tu nueva clave" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#055740] bg-[#F9FAFB] dark:bg-[#044c38] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dfyf-green transition-all font-bold"
                />
              </div>

              {changePasswordError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl text-center">
                  ⚠️ {changePasswordError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setTempUserToLogin(null);
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setLoginPassword("");
                  }}
                  className="flex-1 border border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-200 font-bold py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#055740] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="flex-1 bg-dfyf-green text-white font-bold py-3.5 rounded-xl hover:bg-[#046c4e] transition-colors shadow-lg shadow-dfyf-green/20"
                >
                  {isChangingPassword ? "Guardando..." : "Guardar clave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB] dark:bg-[#022c20] transition-colors duration-200 ${isDarkMode ? "dark" : ""}`}>
        <div className="absolute top-6 right-6">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white dark:bg-[#033b2b] hover:bg-gray-100 dark:hover:bg-[#055740] transition-colors border border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm font-bold shadow-sm"
          >
            {isDarkMode ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 shadow-xl flex flex-col items-center">
          <Image src="/logo.png" alt="DFYF Logo" width={180} height={180} className="object-contain mb-8" priority />
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Ingresar al POS</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">Selecciona tu usuario e ingresa tu contraseña</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5 uppercase tracking-wider">Selecciona tu Nombre</label>
              <select 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#055740] bg-[#F9FAFB] dark:bg-[#044c38] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dfyf-green transition-all font-sans font-bold"
              >
                {usersList.length > 0 ? (
                  usersList.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.role === "SUPER_ADMIN" ? "ADMIN" : user.role === "COUNTRY_ADMIN" ? "Admin" : "Vendedor"})
                    </option>
                  ))
                ) : (
                  <option value="">Cargando usuarios...</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5 uppercase tracking-wider">Contraseña</label>
              <input 
                type="password" 
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#055740] bg-[#F9FAFB] dark:bg-[#044c38] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-dfyf-green transition-all"
              />
            </div>

            {loginError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl text-center">
                ⚠️ {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-dfyf-green text-white font-bold text-lg py-3.5 rounded-xl hover:bg-[#046c4e] transition-colors shadow-lg shadow-dfyf-green/20 mt-2 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? "Ingresando..." : "Entrar a la Plataforma"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // View 2: Store Selector
  if (!activeStore) {
    const userStores = currentUser.stores || [];

    if (userStores.length === 0) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB] dark:bg-[#022c20] transition-colors duration-200 ${isDarkMode ? "dark" : ""}`}>
          <div className="w-full max-w-md bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 shadow-xl flex flex-col items-center text-center">
            <span className="text-5xl mb-4">⚠️</span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Sin Tiendas Asignadas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tu usuario no tiene acceso a ninguna tienda en el sistema. Por favor solicita a un Administrador que te asigne una sucursal.</p>
            <button onClick={handleLogout} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-all">
              Cerrar Sesión
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-[#F9FAFB] dark:bg-[#022c20] transition-colors duration-200 ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full max-w-xl bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 shadow-xl flex flex-col items-center">
          <Image src="/logo.png" alt="DFYF Logo" width={140} height={140} className="object-contain mb-6" />
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1.5">¿Dónde operarás hoy?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">Tienes acceso a múltiples tiendas. Selecciona tu bodega activa para el turno:</p>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userStores.map((us) => (
              <button
                key={us.store.id}
                onClick={() => {
                  setActiveStore(us.store);
                  localStorage.setItem("dfyf_store", JSON.stringify(us.store));
                }}
                className="p-5 bg-[#F9FAFB] dark:bg-[#044c38] border border-gray-200 dark:border-[#055740] hover:border-dfyf-green dark:hover:border-dfyf-green hover:shadow-md rounded-2xl flex flex-col text-left transition-all group cursor-pointer"
              >
                <span className="text-3xl mb-3">🏢</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white leading-tight group-hover:text-dfyf-green transition-colors">{us.store.name}</span>
                {us.store.address && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{us.store.address}</span>
                )}
              </button>
            ))}
          </div>

          <button onClick={handleLogout} className="mt-8 text-sm font-bold text-gray-500 hover:text-red-500 transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // View 3: Main Layout
  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? "dark" : ""} bg-[#F9FAFB] dark:bg-[#022c20] text-gray-900 dark:text-white transition-colors duration-200`}>
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white dark:bg-[#033b2b] border-r border-gray-200 dark:border-[#055740] flex flex-col z-10 transition-colors duration-200">
        <div className="p-6 border-b border-gray-200 dark:border-[#055740] flex items-center justify-center">
          <Image src="/logo.png" alt="DFYF Logo" width={140} height={140} className="object-contain" priority />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 font-bold">
          <button 
            onClick={() => setActiveTab("pos")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "pos" 
                ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
            }`}
          >
            <span>🛒 Registrar Venta</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("returns")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "returns" 
                ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
            }`}
          >
            <span>🔄 Cambio/Devolución</span>
          </button>

          <button 
            onClick={() => setActiveTab("customers")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "customers" 
                ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
            }`}
          >
            <span>👥 Clientes</span>
          </button>

          <button 
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "reports" 
                ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
            }`}
          >
            <span>📊 Venta Mensual</span>
          </button>

          {currentUser.role !== "CLERK" && (
            <>
              <button 
                onClick={() => setActiveTab("analytics")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === "analytics" 
                    ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                    : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span>📈 Análisis Ventas</span>
              </button>

              <button 
                onClick={() => setActiveTab("styles")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === "styles" 
                    ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                    : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span>👠 Reporte por Estilo</span>
              </button>

              <button 
                onClick={() => setActiveTab("stock")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === "stock" 
                    ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                    : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span>📦 Análisis de Stock</span>
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer: Configuración */}
        <div className="p-4 border-t border-gray-200 dark:border-[#055740]">
          {currentUser.role !== "CLERK" ? (
            <button 
              onClick={() => setActiveTab("admin")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold cursor-pointer ${
                activeTab === "admin" 
                  ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20" 
                  : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#055740]"
              }`}
            >
              <span>⚙️ Configuración</span>
            </button>
          ) : (
            <div className="text-center py-2 text-xs font-bold text-gray-400">
              DFYF Gestor de Ventas
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col bg-[#F9FAFB] dark:bg-[#022c20] transition-colors duration-200 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-[#033b2b] border-b border-gray-200 dark:border-[#055740] flex items-center justify-between px-6 z-10 transition-colors duration-200">
          <div className="flex-1 max-w-xl">
             <div className="text-gray-500 dark:text-gray-400 text-sm font-bold flex items-center gap-2">
               <span>Tienda Activa:</span> 
               <span className="bg-dfyf-green/10 text-dfyf-green px-2.5 py-0.5 rounded-full text-xs font-black">{activeStore.name}</span>
               {currentUser.stores.length > 1 && (
                 <button 
                   onClick={() => {
                     setActiveStore(null);
                     localStorage.removeItem("dfyf_store");
                   }}
                   className="text-[10px] underline hover:text-dfyf-green cursor-pointer ml-1 font-bold"
                 >
                   Cambiar
                 </button>
               )}
             </div>
          </div>

          <div className="flex items-center gap-4 ml-6">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-[#044c38] hover:bg-gray-200 dark:hover:bg-[#055740] transition-colors border border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm font-bold shadow-sm cursor-pointer"
            >
              {isDarkMode ? '☀️ Claro' : '🌙 Oscuro'}
            </button>

            {/* Characteristic User Profile Pill & Dropdown Menu */}
            <div className="relative border-l border-gray-200 dark:border-[#055740] pl-4">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 px-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#044c38] transition-all border border-transparent hover:border-gray-200 dark:hover:border-[#055740] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-dfyf-green flex items-center justify-center text-white font-black shadow-sm group-hover:scale-105 transition-transform">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col text-left">
                   <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                     {currentUser.name}
                     <span className="text-[10px] opacity-60">▼</span>
                   </span>
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">
                     {currentUser.role === "SUPER_ADMIN" ? "ADMIN" : currentUser.role === "COUNTRY_ADMIN" ? "Admin Tienda" : "Vendedor"}
                   </span>
                </div>
              </button>

              {/* User Dropdown Menu Popover */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />

                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl shadow-xl z-30 p-3 space-y-3">
                    <div className="px-3 py-2.5 bg-gray-50 dark:bg-[#022c20]/50 rounded-xl space-y-1">
                      <p className="text-xs font-black text-gray-900 dark:text-white">{currentUser.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-md uppercase">
                        {currentUser.role === "SUPER_ADMIN" ? "Administrador General" : currentUser.role === "COUNTRY_ADMIN" ? "Admin de Tienda" : "Vendedor / POS"}
                      </span>
                    </div>

                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm"
                    >
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Pages */}
        <div className="flex-1 p-6 overflow-hidden">
          
          {/* TAB 1: POS Screen */}
          {activeTab === "pos" && (
            <div className="flex gap-6 h-full overflow-hidden">
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-black">Registrar Venta</h1>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar calzado por modelo..." 
                    className="w-72 px-4 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-dfyf-green shadow-sm"
                  />
                </div>


                {isLoadingCatalog ? (
                  <div className="flex-1 flex items-center justify-center text-sm font-bold text-gray-400">
                    Cargando catálogo e inventario local...
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm font-bold text-gray-400">
                    No se encontraron productos en el inventario.
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-2">
                    {filteredCatalog.map((product, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl p-4 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-dfyf-green/45 transition-all group"
                      >
                        {/* Shoe image from Shopify or fallback emoji */}
                        <div className="w-20 h-20 bg-[#F9FAFB] dark:bg-[#022c20] rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 dark:border-[#055740]/30 flex-shrink-0 relative group-hover:scale-102 transition-transform">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // If image fails to load, clear it to fallback to the emoji
                                (e.target as HTMLImageElement).src = "";
                                (e.target as HTMLImageElement).onerror = null;
                              }}
                            />
                          ) : (
                            <span className="text-3xl select-none">👞</span>
                          )}
                        </div>

                        {/* Model details (Name & Price) */}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-950 dark:text-white text-md leading-snug group-hover:text-dfyf-green transition-colors">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {product.compareAtPrice && product.compareAtPrice > product.price ? (
                              <>
                                <span className="text-xs text-gray-400 dark:text-gray-400 line-through font-semibold">
                                  ${product.compareAtPrice.toLocaleString("es-CL")}
                                </span>
                                <span className="text-dfyf-green dark:text-green-400 font-black text-md">
                                  ${product.price.toLocaleString("es-CL")}
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50">
                                  (-{Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%)
                                </span>
                              </>
                            ) : (
                              <span className="text-dfyf-green dark:text-green-400 font-black text-md">
                                ${product.price.toLocaleString("es-CL")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sizes & Stock Selector */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 max-w-sm sm:max-w-md">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TALLAS (DISPONIBLES)</span>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {product.variants.map((variant) => (
                              <button
                                key={variant.id}
                                disabled={variant.quantity <= 0}
                                onClick={() => addToCart(product.name, variant, product.price)}
                                className={`px-2.5 py-1 text-xs border rounded-lg transition-all flex flex-col items-center min-w-[42px] cursor-pointer ${
                                  variant.quantity <= 0 
                                    ? "bg-gray-100 dark:bg-[#022c20]/50 border-gray-100 dark:border-[#055740]/20 text-gray-300 dark:text-gray-600 line-through cursor-not-allowed" 
                                    : "border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-300 hover:border-dfyf-green hover:text-dfyf-green hover:bg-dfyf-green/5"
                                }`}
                              >
                                <span className="font-black text-sm">{variant.size}</span>
                                <span className="text-sm font-semibold opacity-75">({variant.quantity})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* POS Cart Sidebar */}
              <div className="w-[420px] bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl flex flex-col shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-[#055740] bg-gray-50/50 dark:bg-[#022c20]/20">
                  <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">Carrito de Compra</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                  {cart.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm font-bold uppercase tracking-wider">
                      Carrito Vacío
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.productId} className="flex gap-3 bg-[#F9FAFB] dark:bg-[#044c38] border border-gray-100 dark:border-[#055740] py-1.5 px-3 rounded-lg shadow-sm">
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-xs text-gray-900 dark:text-white leading-tight">{item.productName}</p>
                            <button onClick={() => updateCartQuantity(item.productId, -item.quantity)} className="text-gray-400 hover:text-red-500 transition-colors text-xs ml-2">✕</button>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mt-0.5">
                            Talla: {item.size} {item.quantity > 1 ? `(x${item.quantity})` : ""}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <p className="font-black text-sm text-gray-950 dark:text-white">${item.price.toLocaleString("es-CL")}</p>
                            <div className="flex items-center gap-2">
                              {/* Unit Discount Input */}
                              {item.quantity > 0 && (
                                <div className="flex items-center gap-2 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] px-2 py-0.5 rounded-lg shadow-sm h-8">
                                  <span className="text-[9px] text-gray-400 font-bold uppercase">Desc:</span>
                                  <input 
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="0"
                                    value={item.discount || ""}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                      updateItemDiscount(item.productId, parseFloat(val) || 0);
                                    }}
                                    className="w-16 px-1 text-xs text-gray-950 dark:text-white bg-transparent focus:outline-none text-center font-black"
                                  />
                                  <div className="flex bg-gray-100 dark:bg-[#022c20] rounded-md p-0.5 border border-gray-200/50 dark:border-[#055740]/40 h-6 items-center">
                                    <button
                                      type="button"
                                      onClick={() => updateItemDiscountType(item.productId, "amount")}
                                      className={`px-2 h-full rounded text-[10px] font-black transition-all cursor-pointer ${(item.discountType || "percent") === "amount" ? "bg-dfyf-green text-white" : "text-gray-400 dark:text-gray-500"}`}
                                    >
                                      $
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateItemDiscountType(item.productId, "percent")}
                                      className={`px-2 h-full rounded text-[10px] font-black transition-all cursor-pointer ${(item.discountType || "percent") === "percent" ? "bg-dfyf-green text-white" : "text-gray-400 dark:text-gray-500"}`}
                                    >
                                      %
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-[#F9FAFB] dark:bg-[#022c20] border-t border-gray-200 dark:border-[#055740] space-y-3">
                  {/* Customer CRM identification */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Identificar Cliente (CRM)</label>
                    {identifiedCustomer ? (
                      <div className="flex items-center justify-between bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-lg p-2.5 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{identifiedCustomer.name}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{identifiedCustomer.rut || identifiedCustomer.email}</span>
                        </div>
                        <button onClick={() => setIdentifiedCustomer(null)} className="text-xs text-red-500 font-bold hover:underline cursor-pointer">Quitar</button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5 h-9 items-center">
                          <input 
                            type="text" 
                            placeholder="RUT / Email / Nombre"
                            value={searchCustomerQuery}
                            onChange={(e) => setSearchCustomerQuery(e.target.value)}
                            className="flex-1 h-full px-3 border border-gray-200 dark:border-[#055740] rounded-lg bg-white dark:bg-[#033b2b] text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                          />
                          <button onClick={handleSearchCustomer} className="px-3 h-full bg-dfyf-green text-white font-bold rounded-lg text-xs hover:bg-[#046c4e] transition-all cursor-pointer">
                            Buscar
                          </button>
                          <button 
                            onClick={() => {
                              setNewCustError("");
                              setIsNewCustomerOpen(true);
                            }}
                            className="px-3 h-full bg-dfyf-green text-white font-bold rounded-lg text-xs hover:bg-[#046c4e] transition-all cursor-pointer whitespace-nowrap"
                          >
                            Nuevo
                          </button>
                        </div>
                        {customerSearchError && (
                          <span className="text-[10px] text-red-500 font-bold block">{customerSearchError}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Details & General Discount side-by-side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Forma de Pago</label>
                      <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border border-gray-200 dark:border-[#055740] rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#033b2b] focus:outline-none cursor-pointer h-9 text-gray-900 dark:text-white font-bold"
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA_DEBITO">Débito</option>
                        <option value="TARJETA_CREDITO">Crédito</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Descuento General</label>
                      <div className="flex gap-1 h-9 items-center w-full">
                        <input 
                          type="text" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder={generalDiscountType === "percent" ? "%" : "$"}
                          min="0"
                          max={generalDiscountType === "percent" ? 100 : undefined}
                          value={discountAmount || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setDiscountAmount(Math.max(0, parseFloat(val) || 0));
                          }}
                          className="flex-1 min-w-0 h-full px-2.5 border border-gray-200 dark:border-[#055740] rounded-lg bg-white dark:bg-[#033b2b] text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none font-bold"
                        />
                        <div className="flex bg-gray-100 dark:bg-[#044c38] rounded-lg p-0.5 border border-gray-200 dark:border-[#055740] h-full items-center flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setGeneralDiscountType("amount");
                              setDiscountAmount(0);
                            }}
                            className={`px-2 h-full rounded text-xs font-black transition-all cursor-pointer ${generalDiscountType === "amount" ? "bg-dfyf-green text-white" : "text-gray-500 dark:text-gray-400"}`}
                          >
                            $
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGeneralDiscountType("percent");
                              setDiscountAmount(0);
                            }}
                            className={`px-2 h-full rounded text-xs font-black transition-all cursor-pointer ${generalDiscountType === "percent" ? "bg-dfyf-green text-white" : "text-gray-500 dark:text-gray-400"}`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === "TRANSFERENCIA" && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Banco Origen</label>
                      <input 
                        type="text" 
                        placeholder="Banco"
                        value={paymentBank}
                        onChange={(e) => setPaymentBank(e.target.value)}
                        className="w-full border border-gray-200 dark:border-[#055740] rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <textarea 
                      placeholder="Observaciones de venta..." 
                      value={saleNotes}
                      onChange={(e) => setSaleNotes(e.target.value)}
                      className="w-full border border-gray-200 dark:border-[#055740] rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none h-11 resize-none shadow-sm" 
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-[#055740]/40">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString("es-CL")}</span>
                    </div>
                    {productDiscounts > 0 && (
                      <div className="flex justify-between text-xs text-red-500 font-bold">
                        <span>Descuentos Prod.</span>
                        <span>-${productDiscounts.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    {actualGeneralDiscount > 0 && (
                      <div className="flex justify-between text-xs text-red-500 font-bold">
                        <span>Descuento Gral. {generalDiscountType === "percent" ? `(${discountAmount}%)` : ""}</span>
                        <span>-${actualGeneralDiscount.toLocaleString("es-CL")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-black text-gray-900 dark:text-white pt-1 border-t border-dashed border-gray-200 dark:border-[#055740]/30">
                      <span>Total</span>
                      <span>${total.toLocaleString("es-CL")}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleRegisterSale}
                    disabled={isRegisteringSale || cart.length === 0}
                    className="w-full bg-dfyf-green text-white font-bold py-3.5 rounded-xl hover:bg-[#046c4e] transition-colors shadow-md shadow-dfyf-green/20 mt-1 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isRegisteringSale ? "Registrando..." : "Registrar Venta"}
                  </button>
                </div>
              </div>

              {/* SALE RESULT POPUP MODAL */}
              {showSaleResultModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
                    <div className="space-y-2">
                      {saleResultStatus === "success" && (
                        <div className="w-16 h-16 bg-green-50 dark:bg-green-950/20 text-green-500 border border-green-200 dark:border-green-900 rounded-full flex items-center justify-center text-3xl mx-auto select-none">
                          ✓
                        </div>
                      )}
                      {saleResultStatus === "warning" && (
                        <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-500 border border-yellow-200 dark:border-yellow-900/30 rounded-full flex items-center justify-center text-3xl mx-auto select-none">
                          ⚠️
                        </div>
                      )}
                      {saleResultStatus === "error" && (
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-200 dark:border-red-900 rounded-full flex items-center justify-center text-3xl mx-auto select-none">
                          ✕
                        </div>
                      )}
                      <h2 className="text-xl font-black text-gray-900 dark:text-white pt-2">
                        {saleResultStatus === "success" ? "¡Venta Registrada!" : saleResultStatus === "warning" ? "Venta con Advertencia" : "Error en Registro"}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-4">
                        {saleResultMessage}
                      </p>
                    </div>

                    {/* Shopify Sync Feedback */}
                    <div className="border border-gray-100 dark:border-[#055740] rounded-2xl p-4 bg-gray-50 dark:bg-[#022c20]/50 text-left space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Estado Shopify</span>
                      <div className="flex items-center gap-2">
                        {shopifyStockStatus === "success" ? (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-black">Inventario Sincronizado</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-black">Revisión de stock requerida</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {shopifyStockStatus === "success" 
                          ? "El stock de Shopify fue actualizado correctamente en tiempo real para esta tienda Pasteur (ya no requieres hacerlo manualmente)."
                          : "Hubo un desfase al sincronizar el stock con Shopify. Por favor valida el stock de la variante directamente en tu panel de control de Shopify."}
                      </p>
                    </div>

                    <button
                      onClick={() => setShowSaleResultModal(false)}
                      className="w-full py-3 bg-dfyf-green hover:bg-[#055740] text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                    >
                      Entendido / Nueva Venta
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Returns & Exchanges Screen */}
          {activeTab === "returns" && (
            <div className="h-full overflow-y-auto pr-2 pb-12">
              <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black mb-1">Módulo de Cambios y Devoluciones</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Flujo guiado para realizar el reingreso de calzado y gestionar un cambio o devolución de dinero.</p>
                </div>
                {exchangeCustomer && (
                  <button 
                    onClick={() => {
                      setExchangeCustomer(null);
                      setPurchaseHistory([]);
                      setSelectedReturnItem(null);
                      setSelectedExchangeItems([]);
                      setOperationMode(null);
                      setExchangeSearchQuery("");
                    }}
                    className="px-4 py-2 border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 font-bold rounded-xl text-xs transition-colors self-start md:self-center"
                  >
                    Resetear Flujo
                  </button>
                )}
              </div>

              {/* Paso 1: Clienta */}
              <div className={`bg-white dark:bg-[#033b2b] border rounded-3xl p-6 shadow-sm transition-all duration-350 ${
                !exchangeCustomer 
                  ? "border-dfyf-green ring-2 ring-dfyf-green/10" 
                  : "border-gray-200 dark:border-[#055740]"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                    exchangeCustomer ? "bg-dfyf-green text-white" : "bg-dfyf-green/10 text-dfyf-green"
                  }`}>
                    {exchangeCustomer ? "✓" : "1"}
                  </div>
                  <div>
                    <h2 className="font-black text-lg">Paso 1: Identificación de la Clienta</h2>
                    <p className="text-xs text-gray-500">Busca a la clienta por su nombre completo o correo registrado.</p>
                  </div>
                </div>

                {!exchangeCustomer ? (
                  <div className="mt-4 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ingresa nombre o correo de la clienta..." 
                      value={exchangeSearchQuery}
                      onChange={(e) => setExchangeSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCustomerSearch(); }}
                      className="flex-1 px-4 py-3 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-2 focus:ring-dfyf-green"
                    />
                    <button 
                      onClick={handleCustomerSearch}
                      className="px-6 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Buscar
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 bg-[#F9FAFB] dark:bg-[#022c20] p-4 rounded-2xl border border-gray-100 dark:border-[#055740]/40 flex justify-between items-center">
                    <div>
                      <p className="text-md font-black text-gray-950 dark:text-white">{exchangeCustomer.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{exchangeCustomer.email || "Sin correo"} | {exchangeCustomer.phone || "Sin teléfono"} | RUT: {exchangeCustomer.rut || "Sin RUT"}</p>
                    </div>
                    <div className="bg-dfyf-green/10 text-dfyf-green text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Seleccionada
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 2: Calzado a Devolver */}
              {exchangeCustomer && (
                <div className={`bg-white dark:bg-[#033b2b] border rounded-3xl p-6 shadow-sm transition-all duration-350 ${
                  !selectedReturnItem 
                    ? "border-dfyf-green ring-2 ring-dfyf-green/10" 
                    : "border-gray-200 dark:border-[#055740]"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                      selectedReturnItem ? "bg-dfyf-green text-white" : "bg-dfyf-green/10 text-dfyf-green"
                    }`}>
                      {selectedReturnItem ? "✓" : "2"}
                    </div>
                    <div>
                      <h2 className="font-black text-lg">Paso 2: Calzado a Devolver (Cambio Entra)</h2>
                      <p className="text-xs text-gray-500">Selecciona el calzado del historial que la clienta va a reingresar.</p>
                    </div>
                  </div>

                  {!selectedReturnItem ? (
                    purchaseHistory.length === 0 ? (
                      <div className="mt-4 text-center text-gray-400 py-6 text-sm">
                        La clienta no registra compras anteriores en la base de datos.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                        {purchaseHistory.map((sale) => {
                          const saleDate = new Date(sale.date);
                          const daysDiff = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <div key={sale.id} className="border border-gray-150 dark:border-[#055740]/40 rounded-2xl p-4 bg-white dark:bg-[#044c38]/10 space-y-2">
                              <div className="flex justify-between text-xs text-gray-400 font-bold border-b border-gray-100 dark:border-white/5 pb-2">
                                <span>COMPRA #{sale.id.slice(0,8).toUpperCase()} ({saleDate.toLocaleDateString("es-CL")})</span>
                                <span>Canal: {sale.channel} | {daysDiff} días transcurridos</span>
                              </div>
                              <div className="space-y-2.5">
                                {sale.items.map((item: any) => {
                                  const paid = item.price - (item.discount || 0);
                                  return (
                                    <div key={item.id} className="flex justify-between items-center text-sm font-bold bg-gray-50 dark:bg-white/5 p-2 rounded-xl">
                                      <div>
                                        <p className="text-gray-950 dark:text-white">{item.product.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">Talla: {item.product.size} | Pagó: ${paid.toLocaleString("es-CL")}</p>
                                      </div>
                                      {item.quantity > 0 && (
                                        <button
                                          onClick={() => {
                                            setSelectedReturnItem({
                                              productId: item.productId,
                                              productName: item.product.name,
                                              size: item.product.size,
                                              pricePaid: paid,
                                              discount: item.discount || 0,
                                              saleId: sale.id,
                                              saleChannel: sale.channel,
                                              saleDate: sale.date,
                                            });
                                          }}
                                          className="px-3 py-1.5 bg-dfyf-green hover:bg-[#046c4e] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                        >
                                          Seleccionar
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="mt-4 bg-[#F9FAFB] dark:bg-[#022c20] p-4 rounded-2xl border border-gray-100 dark:border-[#055740]/40 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Calzado Seleccionado para Devolución</p>
                        <p className="text-md font-black text-gray-950 dark:text-white mt-1">{selectedReturnItem.productName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Talla: {selectedReturnItem.size} | Monto Pagado: ${selectedReturnItem.pricePaid.toLocaleString("es-CL")} | De Compra #{selectedReturnItem.saleId.slice(0,8).toUpperCase()}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedReturnItem(null);
                          setSelectedExchangeItems([]);
                          setOperationMode(null);
                        }}
                        className="px-3 py-1 border border-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 font-bold rounded-lg text-xs"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Paso 3: Selección de Modo y Calzados a Llevar */}
              {selectedReturnItem && (
                <div className={`bg-white dark:bg-[#033b2b] border rounded-3xl p-6 shadow-sm transition-all duration-350 ${
                  !operationMode 
                    ? "border-dfyf-green ring-2 ring-dfyf-green/10" 
                    : "border-gray-200 dark:border-[#055740]"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                      operationMode ? "bg-dfyf-green text-white" : "bg-dfyf-green/10 text-dfyf-green"
                    }`}>
                      {operationMode ? "✓" : "3"}
                    </div>
                    <div>
                      <h2 className="font-black text-lg">Paso 3: Selección de Modo</h2>
                      <p className="text-xs text-gray-500">Selecciona si realizarás un Cambio de Calzado o una Devolución directa de Dinero.</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-4">
                    <button
                      onClick={() => {
                        setOperationMode("EXCHANGE");
                      }}
                      className={`flex-1 p-4 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                        operationMode === "EXCHANGE"
                          ? "border-dfyf-green bg-dfyf-green/5 text-dfyf-green"
                          : "border-gray-200 hover:border-gray-400 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <span className="text-xl block mb-1">🔄</span>
                      Cambio de Calzado
                    </button>
                    <button
                      onClick={() => {
                        setOperationMode("REFUND");
                        setSelectedExchangeItems([]);
                      }}
                      className={`flex-1 p-4 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                        operationMode === "REFUND"
                          ? "border-dfyf-green bg-dfyf-green/5 text-dfyf-green"
                          : "border-gray-200 hover:border-gray-400 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <span className="text-xl block mb-1">💵</span>
                      Devolución de Dinero (Reembolso)
                    </button>
                  </div>

                  {/* Mode Content */}
                  {operationMode === "REFUND" && (() => {
                    const saleDate = new Date(selectedReturnItem.saleDate);
                    const daysDiff = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
                    const isOffline = selectedReturnItem.saleChannel === "OFFLINE";
                    const refundEligible = !isOffline && daysDiff <= 10;
                    return (
                      <div className="mt-4 p-4 rounded-2xl border bg-gray-50 dark:bg-white/5 space-y-3">
                        <h4 className="font-bold text-sm">Estado de Elegibilidad del Reembolso:</h4>
                        {refundEligible ? (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold">
                            ✓ Apto para Reembolso: Compra web (ONLINE) dentro del plazo de 10 días.
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold space-y-1">
                            <p>⚠️ Excepción requerida:</p>
                            {isOffline ? (
                              <p>• Esta compra fue presencial en tienda física. Según la política general de la tienda, no se admite devolución de dinero, solo cambios de productos.</p>
                            ) : (
                              <p>• La compra excede el plazo de 10 días ({daysDiff} días transcurridos).</p>
                            )}
                            <p className="mt-1 text-[10px] font-black text-amber-600 dark:text-amber-450 uppercase">La vendedora deberá autorizar la excepción al confirmar la operación.</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Medio de Pago para el Reembolso</label>
                          <select 
                            value={exchangePaymentMethod}
                            onChange={(e) => setExchangePaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none"
                          >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="DÉBITO">Débito</option>
                            <option value="CRÉDITO">Tarjeta de Crédito / Webpay</option>
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                            <option value="MERCADO PAGO TARJETAS">Mercado Pago Tarjetas</option>
                          </select>
                        </div>
                      </div>
                    );
                  })()}

                  {operationMode === "EXCHANGE" && (
                    <div className="mt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm">Calzados Nuevos a Llevar (Cambio Sale):</h4>
                        <button
                          onClick={() => {
                            setExchangeCatalogSearchQuery("");
                            setShowExchangeCatalogPopup(true);
                          }}
                          className="px-4 py-2 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                        >
                          + Seleccionar Calzado a Llevar
                        </button>
                      </div>

                      {selectedExchangeItems.length === 0 ? (
                        <div className="border border-dashed border-gray-200 dark:border-[#055740] rounded-2xl p-6 text-center text-gray-400 text-xs">
                          Haz clic en el botón de arriba para buscar en el catálogo y seleccionar el calzado que se llevará la clienta.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedExchangeItems.map((it) => (
                            <div key={it.productId} className="flex justify-between items-center p-3 border border-gray-150 dark:border-[#055740]/40 rounded-xl bg-gray-50 dark:bg-white/5 text-sm font-bold">
                              <div>
                                <p className="text-gray-950 dark:text-white">{it.productName}</p>
                                <p className="text-xs text-gray-400 font-medium">Talla: {it.size} | Precio: ${it.price.toLocaleString("es-CL")} | Cantidad: {it.quantity}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedExchangeItems(
                                    selectedExchangeItems.filter(x => x.productId !== it.productId)
                                  );
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-500/5 transition-colors"
                              >
                                Eliminar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 4: Comparación e Importe (Solo Modo Cambio) */}
              {selectedReturnItem && operationMode === "EXCHANGE" && (
                <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-dfyf-green/10 text-dfyf-green flex items-center justify-center text-sm font-black">
                      4
                    </div>
                    <div>
                      <h2 className="font-black text-lg">Paso 4: Comparación e Importe</h2>
                      <p className="text-xs text-gray-500">Resumen financiero del intercambio de productos.</p>
                    </div>
                  </div>

                  {(() => {
                    const returnAmount = selectedReturnItem.pricePaid;
                    const newItemsTotal = selectedExchangeItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
                    const diff = newItemsTotal - returnAmount;
                    return (
                      <div className="space-y-4 mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl border border-red-500/10 bg-red-500/5 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Calzado Devuelto (Entra)</p>
                              <p className="text-sm font-black text-gray-950 dark:text-white mt-1">{selectedReturnItem.productName}</p>
                              <p className="text-xs text-gray-500">Talla: {selectedReturnItem.size}</p>
                            </div>
                            <p className="text-lg font-black text-red-600 dark:text-red-400 mt-2">-${returnAmount.toLocaleString("es-CL")}</p>
                          </div>

                          <div className="p-4 rounded-2xl border border-green-500/10 bg-green-500/5 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-bold text-green-500 uppercase tracking-wider">Calzados a Llevar (Sale)</p>
                              <p className="text-sm font-black text-gray-950 dark:text-white mt-1">
                                {selectedExchangeItems.length === 0 
                                  ? "Ninguno seleccionado" 
                                  : selectedExchangeItems.map(x => `${x.quantity}x ${x.productName}`).join(', ')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {selectedExchangeItems.length === 0 
                                  ? "-" 
                                  : selectedExchangeItems.map(x => `Talla ${x.size}`).join(', ')}
                              </p>
                            </div>
                            <p className="text-lg font-black text-green-600 dark:text-green-400 mt-2">+${newItemsTotal.toLocaleString("es-CL")}</p>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-gray-150 dark:border-[#055740]/40 bg-[#F9FAFB] dark:bg-[#022c20] flex justify-between items-center text-sm font-bold">
                          <span>Diferencia Financiera (Saldo):</span>
                          {diff < 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-black">Saldo a Favor Cliente: ${Math.abs(diff).toLocaleString("es-CL")}</span>
                          ) : diff > 0 ? (
                            <span className="text-dfyf-green font-black">Saldo a Pagar Tienda: ${diff.toLocaleString("es-CL")}</span>
                          ) : (
                            <span className="text-gray-900 dark:text-white font-black">$0</span>
                          )}
                        </div>

                        {diff < 0 && (
                          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold">
                            ⚠️ Advertencia: El valor de los calzados seleccionados es inferior al devuelto. La clienta perderá el saldo de <strong>${Math.abs(diff).toLocaleString("es-CL")}</strong>, ya que no se realiza devolución de dinero en cambios. Puedes proceder con la confirmación si la clienta acepta esta condición.
                          </div>
                        )}

                        {diff > 0 && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase">Medio de Pago para el Excedente</label>
                            <select 
                              value={exchangePaymentMethod}
                              onChange={(e) => setExchangePaymentMethod(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none"
                            >
                              <option value="EFECTIVO">Efectivo</option>
                              <option value="DÉBITO">Débito</option>
                              <option value="CRÉDITO">Tarjeta de Crédito / Webpay</option>
                              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                              <option value="MERCADO PAGO TARJETAS">Mercado Pago Tarjetas</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Paso 5: Confirmar Operación */}
              {selectedReturnItem && operationMode && (() => {
                const canConfirm = operationMode === "REFUND" || selectedExchangeItems.length > 0;
                return (
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                    <div className="flex items-center gap-3 justify-center w-full">
                      <div className="w-8 h-8 rounded-full bg-dfyf-green/10 text-dfyf-green flex items-center justify-center text-sm font-black">
                        {operationMode === "REFUND" ? "4" : "5"}
                      </div>
                      <h2 className="font-black text-lg">Confirmar Operación</h2>
                    </div>

                    <p className="text-sm text-gray-500">
                      {operationMode === "REFUND" 
                        ? `Al confirmar, se procesará el reembolso de $${selectedReturnItem.pricePaid.toLocaleString("es-CL")} a favor de la clienta. El stock del calzado devuelto se sumará en Shopify.`
                        : `Al confirmar, se guardará el intercambio. El calzado devuelto ingresará a stock y los calzados nuevos se descontarán tanto localmente como en Shopify.`
                      }
                    </p>

                    <button
                      disabled={!canConfirm || isProcessingExchange}
                      onClick={submitExchangeOrRefund}
                      className={`w-full py-4 rounded-2xl font-black text-md transition-all shadow-md flex items-center justify-center gap-2 ${
                        canConfirm && !isProcessingExchange
                          ? "bg-dfyf-green hover:bg-[#046c4e] text-white cursor-pointer"
                          : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      }`}
                    >
                      {isProcessingExchange ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Procesando Transacción...
                        </>
                      ) : operationMode === "REFUND" ? (
                        "Confirmar Devolución y Reembolso"
                      ) : (
                        "Confirmar Cambio de Calzados"
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* POPUP 1: Coincidencias de Clientas */}
              {isCustomerSearchPopupOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col space-y-4 shadow-2xl animate-fade-in">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-black text-gray-950 dark:text-white">Coincidencias de Clientas</h2>
                        <p className="text-xs text-gray-500 mt-1">Se encontraron múltiples coincidencias. Selecciona la clienta correcta para continuar.</p>
                      </div>
                      <button 
                        onClick={() => setIsCustomerSearchPopupOpen(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-150 dark:border-[#055740] text-gray-500 font-bold">
                            <th className="py-2.5 px-3">Nombre</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Teléfono</th>
                            <th className="py-2.5 px-3">RUT</th>
                            <th className="py-2.5 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#055740]/30 font-medium">
                          {exchangeCustomerSearchResults.map((cust) => (
                            <tr key={cust.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3 text-gray-950 dark:text-white font-bold">{cust.name}</td>
                              <td className="py-3 px-3 text-xs">{cust.email || "-"}</td>
                              <td className="py-3 px-3 text-xs">{cust.phone || "-"}</td>
                              <td className="py-3 px-3 text-xs font-mono">{cust.rut || "-"}</td>
                              <td className="py-3 px-3 text-right">
                                <button 
                                  onClick={() => selectExchangeCustomer(cust)}
                                  className="px-3 py-1 bg-dfyf-green hover:bg-[#046c4e] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  Seleccionar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* POPUP 2: Seleccionar Calzado a Llevar */}
              {showExchangeCatalogPopup && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col space-y-4 shadow-2xl animate-fade-in">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-black text-gray-950 dark:text-white">Seleccionar Calzado a Llevar</h2>
                        <p className="text-xs text-gray-500 mt-1">Busca el modelo y selecciona la talla para agregar al cambio.</p>
                      </div>
                      <button 
                        onClick={() => setShowExchangeCatalogPopup(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <input 
                      type="text" 
                      placeholder="Buscar por nombre de modelo..." 
                      value={exchangeCatalogSearchQuery}
                      onChange={(e) => setExchangeCatalogSearchQuery(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-2 focus:ring-dfyf-green"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1" style={{ maxHeight: "50vh" }}>
                      {catalog
                        .filter((item: any) => 
                          !exchangeCatalogSearchQuery || 
                          item.name.toLowerCase().includes(exchangeCatalogSearchQuery.toLowerCase())
                        )
                        .map((item: any) => (
                          <div key={item.name} className="border border-gray-150 dark:border-[#055740]/40 rounded-2xl p-4 flex gap-4 bg-[#F9FAFB] dark:bg-[#044c38]/20 hover:border-gray-200 transition-all">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-none shadow-xs"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400">Sin foto</div>
                            )}
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="font-bold text-sm text-gray-950 dark:text-white">{item.name}</h4>
                                <p className="text-xs text-gray-400 font-medium mt-0.5">{item.family || "Sin categoría"}</p>
                                <p className="text-xs font-black text-gray-900 dark:text-white mt-1">${item.price.toLocaleString("es-CL")}</p>
                              </div>
                              
                              {/* Tallas */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.variants.map((v: any) => {
                                  const hasStock = v.quantity > 0;
                                  return (
                                    <button
                                      key={v.id}
                                      disabled={!hasStock}
                                      onClick={() => {
                                        const existing = selectedExchangeItems.find(x => x.productId === v.id);
                                        if (existing) {
                                          setSelectedExchangeItems(
                                            selectedExchangeItems.map(x => 
                                              x.productId === v.id 
                                                ? { ...x, quantity: x.quantity + 1 } 
                                                : x
                                            )
                                          );
                                        } else {
                                          setSelectedExchangeItems([
                                            ...selectedExchangeItems,
                                            {
                                              productId: v.id,
                                              productName: item.name,
                                              size: v.size,
                                              price: item.price,
                                              quantity: 1,
                                            }
                                          ]);
                                        }
                                        alert(`Agregado: ${item.name} (Talla ${v.size})`);
                                      }}
                                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                                        hasStock
                                          ? "bg-white dark:bg-[#033b2b] text-gray-800 dark:text-white border-gray-300 dark:border-[#055740] hover:bg-gray-50 hover:border-gray-400"
                                          : "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-none cursor-not-allowed"
                                      }`}
                                      title={`Stock disponible: ${v.quantity}`}
                                    >
                                      {v.size} ({v.quantity})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setShowExchangeCatalogPopup(false)}
                        className="px-6 py-2 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Listo / Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* TAB 3: Customers Screen */}
          {activeTab === "customers" && (() => {
            const isAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "COUNTRY_ADMIN";

            const filteredCustomers = customersList.filter(c => {
              const matchName = !filterName || c.name.toLowerCase().includes(filterName.toLowerCase());
              const matchRut = !filterRut || (c.rut && c.rut.toLowerCase().includes(filterRut.toLowerCase()));
              const matchEmail = !filterEmail || (c.email && c.email.toLowerCase().includes(filterEmail.toLowerCase()));
              const matchSize = selectedCustomerSizes.length === 0 || (
                c.tallasCompradas && c.tallasCompradas.split(',').map((s: string) => s.trim()).some((sz: string) => selectedCustomerSizes.includes(sz))
              );
              return matchName && matchRut && matchEmail && matchSize;
            });

            // Sort logic
            const sortedCustomers = [...filteredCustomers].sort((a, b) => {
              if (!sortField) return 0;
              let valA = a[sortField];
              let valB = b[sortField];

              if (valA === null || valA === undefined) return sortDirection === "asc" ? 1 : -1;
              if (valB === null || valB === undefined) return sortDirection === "asc" ? -1 : 1;

              if (sortField === "fechaUltimaCompra") {
                const timeA = new Date(valA).getTime();
                const timeB = new Date(valB).getTime();
                return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
              }

              // Numeric sort for zapatosComprados
              return sortDirection === "asc" ? valA - valB : valB - valA;
            });

            // Extract unique valid emails from current filtered list
            const filteredEmails = Array.from(
              new Set(
                sortedCustomers
                  .map((c) => (c.email ? c.email.trim().toLowerCase() : ""))
                  .filter((e) => e && e.length > 3 && e.includes("@"))
              )
            );
            const formattedEmailsString = filteredEmails.join(", ");

            const handleCopyEmails = () => {
              if (!formattedEmailsString) return;
              navigator.clipboard.writeText(formattedEmailsString);
              setCopiedEmailStatus(true);
              setTimeout(() => setCopiedEmailStatus(false), 2500);
            };

            const toggleSort = (field: "zapatosComprados" | "fechaUltimaCompra") => {
              if (sortField === field) {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              } else {
                setSortField(field);
                setSortDirection("desc");
              }
            };

            const openEditCustomerModal = (cust: any) => {
              setEditingCustomer(cust);
              setEditName(cust.name || "");
              setEditRut(cust.rut || "");
              setEditEmail(cust.email || "");
              setEditPhone(cust.phone || "");
              setEditError("");
            };

            const handleSaveEditCustomer = async (e: React.FormEvent) => {
              e.preventDefault();
              if (!editingCustomer) return;
              setIsSavingEdit(true);
              setEditError("");

              try {
                const res = await fetch(`${API_BASE_URL}/admin/customers/${editingCustomer.id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    "x-user-id": currentUser?.id || "",
                  },
                  body: JSON.stringify({
                    name: editName,
                    rut: editRut || null,
                    email: editEmail || null,
                    phone: editPhone || null,
                  }),
                });
                if (res.ok) {
                  await fetchCustomersList();
                  setEditingCustomer(null);
                } else {
                  const errData = await res.json();
                  setEditError(errData.message || "Error al actualizar el cliente.");
                }
              } catch (err) {
                setEditError("Ocurrió un error al guardar los cambios.");
              } finally {
                setIsSavingEdit(false);
              }
            };

            const handleSaveNewCustomer = async (e: React.FormEvent) => {
              e.preventDefault();
              setIsSavingNewCustomer(true);
              setNewCustomerError(null);

              try {
                const res = await fetch(`${API_BASE_URL}/admin/customers`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-user-id": currentUser?.id || "",
                  },
                  body: JSON.stringify({
                    name: newCustomerName,
                    rut: newCustomerRut || null,
                    email: newCustomerEmail || null,
                    phone: newCustomerPhone || null,
                  }),
                });

                if (res.ok) {
                  await fetchCustomersList();
                  setIsNewCustomerModalOpen(false);
                } else {
                  const errData = await res.json();
                  setNewCustomerError(errData.message || "Error al registrar el nuevo cliente.");
                }
              } catch (err) {
                setNewCustomerError("Ocurrió un error al conectar con el servidor.");
              } finally {
                setIsSavingNewCustomer(false);
              }
            };

            const handleConfirmDeleteCustomer = async () => {
              if (!deletingCustomer) return;
              setIsDeletingCustomer(true);
              setDeleteCustomerError(null);

              try {
                const res = await fetch(`${API_BASE_URL}/admin/customers/${deletingCustomer.id}`, {
                  method: "DELETE",
                  headers: {
                    "x-user-id": currentUser?.id || "",
                  },
                });

                if (res.ok) {
                  await fetchCustomersList();
                  setDeletingCustomer(null);
                } else {
                  const errData = await res.json();
                  setDeleteCustomerError(errData.message || "Error al eliminar el cliente.");
                }
              } catch (err) {
                setDeleteCustomerError("Ocurrió un error al conectar con el servidor.");
              } finally {
                setIsDeletingCustomer(false);
              }
            };

            return (
              <div className="h-full overflow-y-auto pr-2 pb-12">
                <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 shadow-sm space-y-6 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Directorio de Clientes</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Base de datos limpia y unificada de clientela online y offline</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setCopiedEmailStatus(false);
                          setIsEmailExportModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                        title="Exportar correos de clientes filtrados para Email Marketing"
                      >
                        <span>📧</span> EXPORTAR CORREOS ({filteredEmails.length})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setNewCustomerName("");
                        setNewCustomerRut("");
                        setNewCustomerEmail("");
                        setNewCustomerPhone("");
                        setNewCustomerError(null);
                        setIsNewCustomerModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-dfyf-green hover:bg-[#055740] text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>👤+</span> NUEVO CLIENTE
                    </button>
                  </div>
                </div>

                {/* Filters grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-[#022c20]/50 border border-gray-100 dark:border-[#055740] p-4 rounded-2xl">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Filtrar por Nombre</label>
                    <input
                      type="text"
                      placeholder="Buscar nombre..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#033b2b] text-xs text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Filtrar por RUT</label>
                    <input
                      type="text"
                      placeholder="Buscar RUT..."
                      value={filterRut}
                      onChange={(e) => setFilterRut(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#033b2b] text-xs text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Filtrar por Correo</label>
                    <input
                      type="text"
                      placeholder="Buscar correo..."
                      value={filterEmail}
                      onChange={(e) => setFilterEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#033b2b] text-xs text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Filtrar por Tallas</label>
                    <button
                      type="button"
                      onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#033b2b] text-xs text-left font-semibold text-gray-900 dark:text-white flex justify-between items-center cursor-pointer shadow-xs"
                    >
                      <span className="truncate">
                        {selectedCustomerSizes.length === 0 ? "Todas las tallas" : `Tallas (${selectedCustomerSizes.join(", ")})`}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">{isSizeDropdownOpen ? "▲" : "▼"}</span>
                    </button>

                    {isSizeDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsSizeDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl shadow-2xl p-3 z-30 space-y-2 text-xs">
                          <div className="flex justify-between items-center pb-1.5 border-b border-gray-100 dark:border-[#055740]">
                            <span className="font-black text-[10px] uppercase text-gray-400 tracking-wider">Selección Múltiple</span>
                            {selectedCustomerSizes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerSizes([])}
                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                Ver Todas
                              </button>
                            )}
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            <label className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold">
                              <input
                                type="checkbox"
                                checked={selectedCustomerSizes.length === 0}
                                onChange={() => setSelectedCustomerSizes([])}
                                className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                              />
                              <span>🌐 Todas las tallas</span>
                            </label>

                            {["35", "36", "37", "38", "39", "40", "41", "42"].map((s) => {
                              const isChecked = selectedCustomerSizes.includes(s);
                              return (
                                <label key={s} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold">
                                  <input
                                    type="checkbox"
                                    checked={selectedCustomerSizes.length > 0 && isChecked}
                                    onChange={() => {
                                      if (selectedCustomerSizes.length === 0) {
                                        setSelectedCustomerSizes([s]);
                                      } else if (isChecked) {
                                        setSelectedCustomerSizes(selectedCustomerSizes.filter(val => val !== s));
                                      } else {
                                        setSelectedCustomerSizes([...selectedCustomerSizes, s]);
                                      }
                                    }}
                                    className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                                  />
                                  <span>👟 Talla {s}</span>
                                </label>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-[#055740] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setIsSizeDropdownOpen(false)}
                              className="px-3 py-1 bg-dfyf-green text-white text-xs font-black rounded-lg cursor-pointer hover:bg-dfyf-green/90"
                            >
                              Listo
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-[#055740] rounded-2xl overflow-hidden shadow-sm">
                  {isLoadingCustomers ? (
                    <div className="text-center py-16 text-gray-400 text-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dfyf-green mx-auto mb-3"></div>
                      Cargando base de clientes unificada...
                    </div>
                  ) : sortedCustomers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm bg-white dark:bg-[#033b2b]">
                      <span className="text-4xl block mb-2 select-none">👥</span>
                      No se encontraron clientes con los filtros aplicados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-[#044c38] z-10 select-none">
                          <tr className="border-b border-gray-200 dark:border-[#055740] text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider text-xs">
                            <th className="p-4">Nombre y Apellido</th>
                            <th className="p-4">RUT</th>
                            <th className="p-4">Correo / Teléfono</th>
                            <th 
                              className="p-4 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                              onClick={() => toggleSort("zapatosComprados")}
                            >
                              Zapatos Comprados {sortField === "zapatosComprados" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                            </th>
                            <th className="p-4 text-center">Tallas</th>
                            <th 
                              className="p-4 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                              onClick={() => toggleSort("fechaUltimaCompra")}
                            >
                              Última Compra {sortField === "fechaUltimaCompra" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                            </th>
                            <th className="p-4 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCustomers.map((cust) => (
                            <tr key={cust.id} className="border-b border-gray-100 dark:border-[#055740] last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all bg-white dark:bg-[#033b2b]">
                              <td className="p-4 font-bold text-gray-900 dark:text-white">{cust.name}</td>
                              <td className="p-4 text-gray-600 dark:text-gray-300 font-mono text-xs">{cust.rut || "-"}</td>
                              <td className="p-4 text-gray-600 dark:text-gray-300">
                                <div className="text-xs">{cust.email || "-"}</div>
                                {cust.phone && <div className="text-[10px] text-gray-400 mt-0.5">📞 {cust.phone}</div>}
                              </td>
                              <td className="p-4 text-center font-black text-gray-900 dark:text-white">
                                {cust.zapatosComprados}
                              </td>
                              <td className="p-4 text-center font-bold text-dfyf-green">{cust.tallasCompradas}</td>
                              <td className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs">
                                {cust.fechaUltimaCompra ? new Date(cust.fechaUltimaCompra).toLocaleDateString("es-CL") : "-"}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openEditCustomerModal(cust)}
                                    className="px-3 py-1.5 bg-dfyf-green hover:bg-[#055740] text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingCustomer(cust);
                                      setDeleteCustomerError(null);
                                    }}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-xs transition-colors cursor-pointer border border-red-200 dark:border-red-800/60"
                                    title="Eliminar cliente"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* NEW CUSTOMER MODAL */}
                {isNewCustomerModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                          <span>👤+</span> Registrar Nuevo Cliente
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">El cliente se registrará en la base de datos unificada y en Shopify</p>
                      </div>

                      <form onSubmit={handleSaveNewCustomer} className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nombre Completo *</label>
                          <input
                            type="text"
                            required
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="Nombre y Apellido"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">RUT (Opcional)</label>
                          <input
                            type="text"
                            value={newCustomerRut}
                            onChange={(e) => setNewCustomerRut(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="Sin puntos ni guión (ej: 12345678k)"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Correo Electrónico (Opcional)</label>
                          <input
                            type="email"
                            value={newCustomerEmail}
                            onChange={(e) => setNewCustomerEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="correo@ejemplo.com"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Teléfono (Opcional)</label>
                          <input
                            type="text"
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="Ej: 912345678"
                          />
                        </div>

                        {newCustomerError && (
                          <div className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
                            ⚠️ {newCustomerError}
                          </div>
                        )}

                        <div className="flex space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsNewCustomerModalOpen(false)}
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingNewCustomer}
                            className="flex-1 py-2.5 bg-dfyf-green hover:bg-[#055740] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
                          >
                            {isSavingNewCustomer ? "Guardando..." : "Crear Cliente"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* EDIT CUSTOMER MODAL */}
                {editingCustomer && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Editar Datos de Cliente</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Actualiza la información en la base de datos unificada</p>
                      </div>

                      <form onSubmit={handleSaveEditCustomer} className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="Nombre y Apellido"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">RUT</label>
                          <input
                            type="text"
                            value={editRut}
                            onChange={(e) => setEditRut(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="Sin puntos ni guión (ej: 12345678k)"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Correo Electrónico</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="correo@ejemplo.com"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Teléfono</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#055740] rounded-xl bg-gray-50 dark:bg-[#044c38] text-sm text-gray-900 dark:text-white focus:outline-none"
                            placeholder="Ej: +56912345678"
                          />
                        </div>

                        {editError && (
                          <div className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
                            ⚠️ {editError}
                          </div>
                        )}

                        <div className="flex space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingCustomer(null)}
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingEdit}
                            className="flex-1 py-2.5 bg-dfyf-green hover:bg-[#055740] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
                          >
                            {isSavingEdit ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* DELETE CUSTOMER CONFIRMATION MODAL */}
                {deletingCustomer && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                      <div>
                        <h2 className="text-xl font-black text-red-600 dark:text-red-400 flex items-center gap-2">
                          <span>⚠️</span> ¿Seguro quiere eliminar el cliente?
                        </h2>
                        <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold mt-3">
                          Estás a punto de eliminar a <span className="font-black text-gray-900 dark:text-white">"{deletingCustomer.name}"</span> de la base de datos local.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Esta acción removerá la ficha del sistema POS local. El cliente no será eliminado de Shopify.
                        </p>
                      </div>

                      {deleteCustomerError && (
                        <div className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
                          ⚠️ {deleteCustomerError}
                        </div>
                      )}

                      <div className="flex space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setDeletingCustomer(null)}
                          className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteCustomer}
                          disabled={isDeletingCustomer}
                          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer text-center shadow-md"
                        >
                          {isDeletingCustomer ? "Eliminando..." : "Eliminar Cliente"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* EMAIL EXPORT MODAL FOR ADMIN */}
                {isEmailExportModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 max-w-xl w-full shadow-2xl space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <span>📧</span> Exportar Correos para Email Marketing
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {filteredEmails.length} correo{filteredEmails.length === 1 ? "" : "s"} único{filteredEmails.length === 1 ? "" : "s"} encontrado{filteredEmails.length === 1 ? "" : "s"} entre los {sortedCustomers.length} clientes filtrados.
                          </p>
                        </div>
                        <button
                          onClick={() => setIsEmailExportModalOpen(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Correos separados por coma y espacio (listos para copiar e insertar en Mailchimp, Klaviyo, etc.):
                        </label>
                        <textarea
                          readOnly
                          rows={6}
                          value={formattedEmailsString || "No hay correos registrados en los clientes actualmente filtrados."}
                          className="w-full p-4 border border-gray-200 dark:border-[#055740] rounded-2xl bg-gray-50 dark:bg-[#044c38] text-xs font-mono text-gray-900 dark:text-white focus:outline-none resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEmailExportModalOpen(false)}
                          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
                        >
                          Cerrar
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyEmails}
                          disabled={!formattedEmailsString}
                          className={`flex-1 py-3 font-black rounded-xl text-sm transition-all cursor-pointer text-center shadow-md flex items-center justify-center gap-2 ${
                            copiedEmailStatus 
                              ? "bg-emerald-600 text-white" 
                              : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                          }`}
                        >
                          {copiedEmailStatus ? (
                            <>
                              <span>✅</span> ¡Copiado al Portapapeles!
                            </>
                          ) : (
                            <>
                              <span>📋</span> Copiar al Portapapeles
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            );
          })()}

          {/* TAB 4: Reports Screen - Venta Mensual */}
          {activeTab === "reports" && (() => {
            const isAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "COUNTRY_ADMIN";

            const formatEventDate = (dateStr: string) => {
              try {
                const d = new Date(dateStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
              } catch {
                return dateStr;
              }
            };

            const soldUnits = reportData?.goals?.soldUnits ?? 0;
            const breakdown = reportData?.goals?.breakdownBySeller || [];

            const physicalTarget = reportData?.goals?.physicalTarget ?? 50;
            const physicalBreakdown = breakdown.filter((s: any) => s.sellerName !== "ONLINE");
            const physicalSoldUnits = physicalBreakdown.reduce((sum: number, s: any) => sum + s.units, 0);
            const isPhysicalGoalAchieved = physicalSoldUnits >= physicalTarget;

            const onlineTarget = reportData?.goals?.onlineTarget ?? 30;
            const onlineBreakdown = breakdown.filter((s: any) => s.sellerName === "ONLINE");
            const onlineSoldUnits = onlineBreakdown.reduce((sum: number, s: any) => sum + s.units, 0);
            const isOnlineGoalAchieved = onlineSoldUnits >= onlineTarget;

            const filteredItems = (reportData?.items || []).filter((item: any) => {
              if (selectedSellersFilter.length === 0) return true;
              return selectedSellersFilter.includes(item.vendedor);
            });

            const sortedItems = [...filteredItems].sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return reportSortOrder === "desc" ? dateB - dateA : dateA - dateB;
            });

            const uniqueSellers = Array.from(
              new Set(
                (reportData?.items || [])
                  .map((item: any) => item.vendedor)
                  .filter((v: any) => typeof v === 'string' && v.trim() !== '')
              )
            ).sort() as string[];

            const getMonthName = (m: number) => {
              const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
              return months[m - 1] || "";
            };

            const sellerRevenueBreakdown = (() => {
              const map = new Map<string, { totalRevenue: number; totalUnits: number }>();
              (reportData?.items || []).forEach((item: any) => {
                const seller = item.vendedor || "ONLINE";
                const netAmount = (item.salePrice || 0) * (item.quantity || 0);
                const curr = map.get(seller) || { totalRevenue: 0, totalUnits: 0 };
                map.set(seller, {
                  totalRevenue: curr.totalRevenue + netAmount,
                  totalUnits: curr.totalUnits + (!item.isSock && item.quantity > 0 ? item.quantity : 0),
                });
              });

              const grandTotalRevenue = (reportData?.summary?.totalAmount ?? 0);

              return Array.from(map.entries())
                .map(([sellerName, data]) => ({
                  sellerName,
                  totalRevenue: data.totalRevenue,
                  totalUnits: data.totalUnits,
                  percentage: grandTotalRevenue > 0 ? (data.totalRevenue / grandTotalRevenue) * 100 : 0,
                }))
                .sort((a, b) => b.totalRevenue - a.totalRevenue);
            })();

            return (
              <div className="h-full overflow-y-auto pr-2 pb-12">
                <div className="space-y-5">
                  {/* Unified Compact Summary Card */}
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-5 shadow-sm space-y-4">
                    {/* Header Row: Title & Month/Year selectors */}
                    <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 dark:border-[#055740] pb-3">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Venta Mensual</h2>
                        <p className="text-xs text-gray-400 font-bold mt-0.5">
                          {!isAdmin ? "Visualizando información del mes en curso" : "Resumen consolidado y metas del período"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <button
                              disabled={isSyncingOnlineOrders}
                              onClick={async () => {
                                setIsSyncingOnlineOrders(true);
                                try {
                                  const res = await fetch(`${API_BASE_URL}/shopify/sync-orders`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'admin' },
                                    body: JSON.stringify({ limit: 50 }),
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    alert(`✅ ${data.message}`);
                                    fetchStockReport();
                                    fetchReportData();
                                  } else {
                                    alert(`⚠️ ${data.message || 'Error al sincronizar ventas online.'}`);
                                  }
                                } catch (err: any) {
                                  alert(`⚠️ Error de conexión: ${err.message}`);
                                } finally {
                                  setIsSyncingOnlineOrders(false);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 h-9 disabled:opacity-50"
                              title="Sincronizar ventas online recientes de Shopify y descontar su stock en la BD"
                            >
                              <span>🔄</span> {isSyncingOnlineOrders ? "Sincronizando..." : "Sincronizar Ventas Web"}
                            </button>

                            <button
                              onClick={() => setIsSellerRevenueModalOpen(true)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 h-9"
                              title="Ver total vendido en pesos por vendedora en el mes filtrado"
                            >
                              <span>💰</span> Venta por Vendedora
                            </button>
                          </>
                        )}

                        {isAdmin ? (
                          <>
                            <select
                              value={reportYear}
                              onChange={(e) => setReportYear(parseInt(e.target.value))}
                              className="border border-gray-200 dark:border-[#055740] rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-bold h-9 cursor-pointer"
                            >
                              <option value="2025">Año 2025</option>
                              <option value="2026">Año 2026</option>
                            </select>

                            <select
                              value={reportMonth}
                              onChange={(e) => setReportMonth(parseInt(e.target.value))}
                              className="border border-gray-200 dark:border-[#055740] rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-bold h-9 cursor-pointer"
                            >
                              <option value="1">Enero</option>
                              <option value="2">Febrero</option>
                              <option value="3">Marzo</option>
                              <option value="4">Abril</option>
                              <option value="5">Mayo</option>
                              <option value="6">Junio</option>
                              <option value="7">Julio</option>
                              <option value="8">Agosto</option>
                              <option value="9">Septiembre</option>
                              <option value="10">Octubre</option>
                              <option value="11">Noviembre</option>
                              <option value="12">Diciembre</option>
                            </select>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-3.5 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-black rounded-xl border border-gray-200/60 dark:border-white/10">
                              {getMonthName(reportMonth)} {reportYear}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Main Content Grid: Left 2 Totalizers, Right 2 Progress Bars */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                      {/* Left Totalizers Box (3 cols - narrower & centered) */}
                      <div className="lg:col-span-3 bg-[#F9FAFB] dark:bg-[#022c20]/40 border border-gray-200/70 dark:border-[#055740]/40 rounded-2xl p-4 flex flex-col justify-center items-center text-center gap-3">
                        <div className="w-full text-center">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Monto Facturado</span>
                          <span className="text-xl lg:text-2xl font-black text-gray-950 dark:text-white block mt-0.5">${(reportData?.summary?.totalAmount ?? 0).toLocaleString("es-CL")}</span>
                        </div>
                        <div className="w-full border-t border-gray-200/70 dark:border-[#055740]/40 pt-2.5 text-center">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Pares Vendidos</span>
                          <span className="text-xl lg:text-2xl font-black text-gray-950 dark:text-white block mt-0.5">{soldUnits} pares</span>
                        </div>
                      </div>

                      {/* Right Progress Bars Box (9 cols - wider!) */}
                      <div className="lg:col-span-9 flex flex-col justify-between gap-3">
                        {/* 1. Meta Mensual Tienda */}
                        <div className="bg-[#F9FAFB] dark:bg-[#022c20]/40 border border-gray-200/70 dark:border-[#055740]/40 rounded-2xl p-3.5 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-black text-gray-900 dark:text-white">
                              Meta Mensual Tienda: {physicalSoldUnits} / {physicalTarget} Pares
                            </span>
                            <span className="font-bold text-gray-500">
                              {physicalTarget > 0 ? ((physicalSoldUnits / physicalTarget) * 100).toFixed(1) : 0}%
                            </span>
                          </div>

                          <div className={`w-full bg-gray-200 dark:bg-white/10 h-5 rounded-full overflow-hidden flex relative ${isPhysicalGoalAchieved ? "ring-2 ring-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : ""}`}>
                            {physicalSoldUnits > 0 ? (
                              physicalBreakdown.map((seller: any, idx: number) => {
                                const segmentWidth = (seller.units / physicalTarget) * 100;
                                return (
                                  <div
                                    key={idx}
                                    className="h-full transition-all duration-500 relative group"
                                    style={{ width: `${segmentWidth}%`, backgroundColor: seller.color }}
                                    title={`${seller.sellerName}: ${seller.units} pares`}
                                  />
                                );
                              })
                            ) : (
                              <div className="text-center text-[10px] text-gray-400 flex items-center justify-center w-full font-bold">Sin ventas físicas</div>
                            )}
                          </div>

                          {/* Legend */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                            {physicalBreakdown.map((seller: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seller.color }}></span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{seller.sellerName}:</span>
                                <span className="font-medium text-gray-500 dark:text-gray-400">{seller.units} p.</span>
                              </div>
                            ))}
                            {physicalBreakdown.length === 0 && (
                              <span className="text-xs text-gray-400 font-bold">Sin aportes de vendedoras.</span>
                            )}
                          </div>
                        </div>

                        {/* 2. Venta Mensual Online */}
                        <div className="bg-[#F9FAFB] dark:bg-[#022c20]/40 border border-gray-200/70 dark:border-[#055740]/40 rounded-2xl p-3.5 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-black text-gray-900 dark:text-white">
                              Venta Mensual Online: {onlineSoldUnits} / {onlineTarget} Pares
                            </span>
                            <span className="font-bold text-gray-500">
                              {onlineTarget > 0 ? ((onlineSoldUnits / onlineTarget) * 100).toFixed(1) : 0}%
                            </span>
                          </div>

                          <div className={`w-full bg-gray-200 dark:bg-white/10 h-5 rounded-full overflow-hidden flex relative ${isOnlineGoalAchieved ? "ring-2 ring-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : ""}`}>
                            {onlineSoldUnits > 0 ? (
                              onlineBreakdown.map((seller: any, idx: number) => {
                                const segmentWidth = (seller.units / onlineTarget) * 100;
                                return (
                                  <div
                                    key={idx}
                                    className="h-full transition-all duration-500 relative group"
                                    style={{ width: `${segmentWidth}%`, backgroundColor: seller.color }}
                                    title={`ONLINE: ${seller.units} pares`}
                                  />
                                );
                              })
                            ) : (
                              <div className="text-center text-[10px] text-gray-400 flex items-center justify-center w-full font-bold">Sin ventas online</div>
                            )}
                          </div>

                          {/* Legend */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                            {onlineBreakdown.map((seller: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seller.color }}></span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">Canal ONLINE:</span>
                                <span className="font-medium text-gray-500 dark:text-gray-400">{seller.units} p.</span>
                              </div>
                            ))}
                            {onlineBreakdown.length === 0 && (
                              <span className="text-xs text-gray-400 font-bold">Sin ventas online registradas.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Loading state */}
                  {isLoadingReport && (
                    <div className="py-20 text-center text-sm font-bold text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dfyf-green"></div>
                      <span>Cargando detalle de ventas...</span>
                    </div>
                  )}

                  {/* Detailed sales event log */}
                  {!isLoadingReport && (
                    <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl overflow-hidden shadow-sm flex flex-col">
                      <div className="overflow-y-auto max-h-[520px]">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-[#033b2b] dark:border-[#055740] border-b border-gray-100 backdrop-blur-xs">
                            <tr className="text-gray-400 font-bold uppercase tracking-wider text-xs">
                              <th 
                                onClick={() => setReportSortOrder(reportSortOrder === "desc" ? "asc" : "desc")}
                                className="p-3.5 pl-5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 select-none transition-colors"
                              >
                                Fecha {reportSortOrder === "desc" ? "▼" : "▲"}
                              </th>
                              <th className="p-3.5">Evento</th>
                              <th className="p-3.5">Modelo</th>
                              <th className="p-3.5">Talla</th>
                              <th className="p-3.5 text-right">P. Original</th>
                              <th className="p-3.5 text-right">P. Venta</th>
                              <th className="p-3.5 text-right">Descuento</th>
                              <th className="p-3.5 pr-5 relative select-none">
                                <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setIsSellerFilterOpen(!isSellerFilterOpen);
                                     }}>
                                  <span>Vendedor</span>
                                  <span className={`text-[10px] p-0.5 rounded ${selectedSellersFilter.length > 0 ? "text-dfyf-green font-black" : "text-gray-400"}`}>
                                    {selectedSellersFilter.length > 0 ? `(${selectedSellersFilter.length}) 𝝪` : "𝝪"}
                                  </span>
                                </div>

                                {isSellerFilterOpen && (
                                  <>
                                    <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setIsSellerFilterOpen(false); }} />
                                    <div className="absolute right-2 top-full mt-1.5 w-48 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl shadow-xl z-30 p-3 text-gray-900 dark:text-white normal-case font-medium text-left">
                                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100 dark:border-[#055740]/40 text-[10px] font-bold text-gray-400">
                                        <span>FILTRAR VENDEDOR</span>
                                        {selectedSellersFilter.length > 0 && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSellersFilter([]);
                                            }}
                                            className="text-red-500 hover:text-red-600 cursor-pointer"
                                          >
                                            Limpiar
                                          </button>
                                        )}
                                      </div>
                                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {uniqueSellers.map((seller) => {
                                          const isChecked = selectedSellersFilter.includes(seller);
                                          return (
                                            <label key={seller} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-xs select-none" onClick={(e) => e.stopPropagation()}>
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  if (isChecked) {
                                                    setSelectedSellersFilter(selectedSellersFilter.filter(s => s !== seller));
                                                  } else {
                                                    setSelectedSellersFilter([...selectedSellersFilter, seller]);
                                                  }
                                                }}
                                                className="rounded border-gray-300 dark:border-[#055740] text-dfyf-green focus:ring-dfyf-green h-3.5 w-3.5 cursor-pointer"
                                              />
                                              <span className="truncate">{seller}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#055740]/30 font-medium">
                            {sortedItems.map((item: any) => (
                              <tr 
                                key={item.id} 
                                className="hover:bg-gray-50/50 dark:hover:bg-[#022c20]/25 transition-colors cursor-pointer"
                                onClick={() => fetchSaleDetail(item.saleId)}
                              >
                                <td className="p-3.5 pl-5 font-bold text-gray-500 dark:text-gray-400">{formatEventDate(item.date)}</td>
                                <td className="p-3.5">
                                  {item.event === "Venta" && (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-green-500/10 text-green-500 border border-green-500/20">Venta</span>
                                  )}
                                  {item.event === "Cambio Entra" && (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">Cambio Entra</span>
                                  )}
                                  {item.event === "Cambio Sale" && (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">Cambio Sale</span>
                                  )}
                                  {item.event === "Devolución" && (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-red-500/10 text-red-500 border border-red-200">Devolución</span>
                                  )}
                                  {item.event === "Regalo" && (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20">Regalo</span>
                                  )}
                                </td>
                                <td className="p-3.5 text-gray-900 dark:text-white font-bold">
                                  {item.model}
                                  {item.isSock && (
                                    <span className="ml-1.5 px-1 py-0.5 text-[8px] bg-gray-100 dark:bg-white/10 rounded font-normal text-gray-400">Accesorio</span>
                                  )}
                                </td>
                                <td className="p-3.5 font-bold">{item.size}</td>
                                <td className="p-3.5 text-right font-bold text-gray-400">${item.originalPrice.toLocaleString("es-CL")}</td>
                                <td className="p-3.5 text-right font-black text-gray-900 dark:text-white">${item.salePrice.toLocaleString("es-CL")}</td>
                                <td className="p-3.5 text-right font-bold text-red-500">
                                  {item.discount > 0 ? (() => {
                                    const discountVal = item.originalPrice - item.salePrice;
                                    const pct = item.originalPrice > 0 ? Math.round((discountVal / item.originalPrice) * 100) : 0;
                                    return `-$${item.discount.toLocaleString("es-CL")} (${pct}%)`;
                                  })() : "-"}
                                </td>
                                <td className="p-3.5 pr-5">
                                  {(() => {
                                    const v = item.vendedor || "ONLINE";
                                    const vLower = v.toLowerCase();
                                    if (vLower === "cambio entra" || vLower === "cambio sale") {
                                      return <span className="text-gray-400 font-bold">-</span>;
                                    }
                                    if (vLower.includes("beatriz")) {
                                      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Beatriz</span>;
                                    }
                                    if (vLower.includes("vicky")) {
                                      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Vicky</span>;
                                    }
                                    if (vLower.includes("marite")) {
                                      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">Marite</span>;
                                    }
                                    if (vLower.includes("online")) {
                                      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">ONLINE</span>;
                                    }
                                    if (vLower.includes("mauricio")) {
                                      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Mauricio</span>;
                                    }
                                    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">{v}</span>;
                                  })()}
                                </td>
                              </tr>
                            ))}

                            {sortedItems.length === 0 && (
                              <tr>
                                <td colSpan={8} className="p-16 text-center text-gray-400 text-sm font-bold">
                                  No se encontraron registros de ventas para el vendedor o periodo seleccionado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* SELLER REVENUE IN PESOS POPUP MODAL (ADMIN ONLY) */}
                {isSellerRevenueModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-7 max-w-lg w-full shadow-2xl space-y-6">
                      {/* Modal Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <span>💰</span> Venta en Pesos por Vendedora
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Recaudación total correspondiente a {getMonthName(reportMonth)} {reportYear}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsSellerRevenueModalOpen(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Summary Total Card */}
                      <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 dark:text-emerald-300 block">Total Facturado en el Mes</span>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Consolidado de todas las vendedoras y canales</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-950 dark:text-emerald-100 block">
                            ${(reportData?.summary?.totalAmount ?? 0).toLocaleString("es-CL")}
                          </span>
                        </div>
                      </div>

                      {/* Sellers Revenue Table */}
                      <div className="border border-gray-200 dark:border-[#055740] rounded-2xl overflow-hidden shadow-xs max-h-80 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-gray-50 dark:bg-[#044c38] z-10 select-none border-b border-gray-200 dark:border-[#055740]">
                            <tr className="text-gray-500 dark:text-gray-300 font-black uppercase tracking-wider">
                              <th className="p-3.5">Vendedora</th>
                              <th className="p-3.5 text-center">Pares</th>
                              <th className="p-3.5 text-center">% Part.</th>
                              <th className="p-3.5 text-right">Total Vendido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#055740]/30 font-medium">
                            {sellerRevenueBreakdown.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-400 font-bold">
                                  No se registraron ventas en {getMonthName(reportMonth)} {reportYear}.
                                </td>
                              </tr>
                            ) : (
                              sellerRevenueBreakdown.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors align-middle">
                                  <td className="p-3.5 font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-dfyf-green shrink-0 inline-block"></span>
                                    <span>{row.sellerName}</span>
                                  </td>
                                  <td className="p-3.5 text-center font-bold text-gray-600 dark:text-gray-300">
                                    {row.totalUnits} p.
                                  </td>
                                  <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                    {row.percentage.toFixed(1)}%
                                  </td>
                                  <td className="p-3.5 text-right font-black text-gray-950 dark:text-white text-sm">
                                    ${row.totalRevenue.toLocaleString("es-CL")}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Modal Actions */}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setIsSellerRevenueModalOpen(false)}
                          className="px-6 py-2.5 bg-dfyf-green hover:bg-[#055740] text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: Análisis Ventas (Gráficos y Métricas) */}
          {activeTab === "analytics" && (() => {
            const summary = {
              totalAmount: analyticsData?.summary?.totalAmount || 0,
              onlineAmount: analyticsData?.summary?.onlineAmount || 0,
              physicalAmount: analyticsData?.summary?.physicalAmount || 0,
              totalUnits: analyticsData?.summary?.totalUnits || 0,
              onlineUnits: analyticsData?.summary?.onlineUnits || 0,
              physicalUnits: analyticsData?.summary?.physicalUnits || 0,
              averageMonthlyAmount: analyticsData?.summary?.averageMonthlyAmount || 0,
            };
            const monthlyData: any[] = Array.isArray(analyticsData?.monthlyData) ? analyticsData.monthlyData : [];

            // SVG Vector Chart Calculations
            const maxMonthlyAmount = Math.max(...monthlyData.map((m: any) => m?.totalAmount || 0), 1000000);
            const gridMax = Math.ceil(maxMonthlyAmount / 5000000) * 5000000 || 5000000;

            const formatShortCLP = (val: number) => {
              const num = val || 0;
              if (num >= 1000000) {
                const millions = (num / 1000000).toFixed(1).replace('.0', '');
                return `$${millions}M`;
              }
              if (num >= 1000) {
                const thousands = Math.round(num / 1000);
                return `$${thousands}K`;
              }
              return `$${num}`;
            };

            const chartWidth = 900;
            const chartHeight = 320;
            const paddingLeft = 65;
            const paddingRight = 30;
            const paddingTop = 35;
            const paddingBottom = 45;
            const innerW = chartWidth - paddingLeft - paddingRight;
            const innerH = chartHeight - paddingTop - paddingBottom;

            const numBars = monthlyData.length;
            const stepW = numBars > 0 ? innerW / numBars : innerW;
            const barW = Math.min(44, Math.max(14, stepW * 0.55));

            // Generate points for vector curve
            const vectorPoints = monthlyData.map((m: any, idx: number) => {
              const amt = m?.totalAmount || 0;
              const x = paddingLeft + (idx + 0.5) * stepW;
              const y = paddingTop + innerH - (amt / gridMax) * innerH;
              return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y, amount: amt, label: m?.monthLabel || "" };
            });

            // Smooth cubic Bezier path
            let curvePathD = "";
            if (vectorPoints.length > 0) {
              if (vectorPoints.length === 1) {
                curvePathD = `M ${vectorPoints[0].x} ${vectorPoints[0].y}`;
              } else {
                curvePathD = `M ${vectorPoints[0].x} ${vectorPoints[0].y}`;
                for (let i = 0; i < vectorPoints.length - 1; i++) {
                  const curr = vectorPoints[i];
                  const next = vectorPoints[i + 1];
                  const cp1x = curr.x + (next.x - curr.x) / 2;
                  const cp1y = curr.y;
                  const cp2x = curr.x + (next.x - curr.x) / 2;
                  const cp2y = next.y;
                  curvePathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
                }
              }
            }

            const pctOnline = summary.totalAmount > 0 ? ((summary.onlineAmount / summary.totalAmount) * 100).toFixed(1) : "0";
            const pctPhysical = summary.totalAmount > 0 ? ((summary.physicalAmount / summary.totalAmount) * 100).toFixed(1) : "0";

            return (
              <div className="h-full overflow-y-auto pr-2 pb-12">
                <div className="space-y-6">
                  {/* Top Bar: Title & Period Filters */}
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 dark:border-[#055740] pb-3">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Análisis Ventas</h2>
                        <p className="text-xs text-gray-400 font-bold mt-0.5">
                          Métricas gráficas y tendencias vectoriales por canal de venta
                        </p>
                      </div>

                      {/* Filter Controls: Desde / Hasta */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#022c20]/40 p-1.5 rounded-2xl border border-gray-200/70 dark:border-[#055740]/40">
                          <span className="text-xs font-black text-gray-500 pl-1">Desde:</span>
                          <select
                            value={analyticsFromYear}
                            onChange={(e) => setAnalyticsFromYear(parseInt(e.target.value))}
                            className="border border-gray-200 dark:border-[#055740] rounded-xl px-2 py-1 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-bold h-8 cursor-pointer"
                          >
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                          </select>
                          <select
                            value={analyticsFromMonth}
                            onChange={(e) => setAnalyticsFromMonth(parseInt(e.target.value))}
                            className="border border-gray-200 dark:border-[#055740] rounded-xl px-2 py-1 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-bold h-8 cursor-pointer"
                          >
                            <option value="1">Ene</option>
                            <option value="2">Feb</option>
                            <option value="3">Mar</option>
                            <option value="4">Abr</option>
                            <option value="5">May</option>
                            <option value="6">Jun</option>
                            <option value="7">Jul</option>
                            <option value="8">Ago</option>
                            <option value="9">Sep</option>
                            <option value="10">Oct</option>
                            <option value="11">Nov</option>
                            <option value="12">Dic</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#022c20]/40 p-1.5 rounded-2xl border border-gray-200/70 dark:border-[#055740]/40">
                          <span className="text-xs font-black text-gray-500 pl-1">Hasta:</span>
                          <select
                            value={analyticsToYear}
                            onChange={(e) => setAnalyticsToYear(parseInt(e.target.value))}
                            className="border border-gray-200 dark:border-[#055740] rounded-xl px-2 py-1 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-bold h-8 cursor-pointer"
                          >
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                          </select>
                          <select
                            value={analyticsToMonth}
                            onChange={(e) => setAnalyticsToMonth(parseInt(e.target.value))}
                            className="border border-gray-200 dark:border-[#055740] rounded-xl px-2 py-1 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-bold h-8 cursor-pointer"
                          >
                            <option value="1">Ene</option>
                            <option value="2">Feb</option>
                            <option value="3">Mar</option>
                            <option value="4">Abr</option>
                            <option value="5">May</option>
                            <option value="6">Jun</option>
                            <option value="7">Jul</option>
                            <option value="8">Ago</option>
                            <option value="9">Sep</option>
                            <option value="10">Oct</option>
                            <option value="11">Nov</option>
                            <option value="12">Dic</option>
                          </select>
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setAnalyticsFromYear(2025); setAnalyticsFromMonth(1);
                              setAnalyticsToYear(2025); setAnalyticsToMonth(12);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-[#055740] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                          >
                            2025
                          </button>
                          <button
                            onClick={() => {
                              setAnalyticsFromYear(2026); setAnalyticsFromMonth(1);
                              setAnalyticsToYear(2026); setAnalyticsToMonth(12);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-[#055740] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                          >
                            2026
                          </button>
                          <button
                            onClick={() => {
                              setAnalyticsFromYear(2025); setAnalyticsFromMonth(1);
                              setAnalyticsToYear(2026); setAnalyticsToMonth(12);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-[#055740] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                          >
                            Todo
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-[#F9FAFB] dark:bg-[#022c20]/40 border border-gray-200/70 dark:border-[#055740]/40 rounded-2xl p-4">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Monto Total Periodo</span>
                        <span className="text-2xl font-black text-gray-950 dark:text-white block mt-0.5">${summary.totalAmount.toLocaleString("es-CL")}</span>
                        <span className="text-[11px] font-bold text-gray-400 mt-1 block">{monthlyData.length} meses seleccionados</span>
                      </div>

                      <div className="bg-[#F9FAFB] dark:bg-[#022c20]/40 border border-gray-200/70 dark:border-[#055740]/40 rounded-2xl p-4">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Ventas ONLINE</span>
                        <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-0.5">${summary.onlineAmount.toLocaleString("es-CL")}</span>
                        <span className="text-[11px] font-bold text-gray-400 mt-1 block">{pctOnline}% del total ({summary.onlineUnits} pares)</span>
                      </div>

                      <div className="bg-[#F9FAFB] dark:bg-[#022c20]/40 border border-gray-200/70 dark:border-[#055740]/40 rounded-2xl p-4">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Tienda Física / Resto</span>
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">${summary.physicalAmount.toLocaleString("es-CL")}</span>
                        <span className="text-[11px] font-bold text-gray-400 mt-1 block">{pctPhysical}% del total ({summary.physicalUnits} pares)</span>
                      </div>

                      <div className="bg-[#F9FAFB] dark:bg-[#022c20]/40 border border-gray-200/70 dark:border-[#055740]/40 rounded-2xl p-4">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Promedio Mensual</span>
                        <span className="text-2xl font-black text-gray-950 dark:text-white block mt-0.5">${summary.averageMonthlyAmount.toLocaleString("es-CL")}</span>
                        <span className="text-[11px] font-bold text-gray-400 mt-1 block">Total pares: {summary.totalUnits} pares</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Vector Chart Card */}
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Monto de Ventas por Mes</h3>
                        <p className="text-xs text-gray-400 font-bold">Gráfico dinámico de barras apiladas y curva vectorial de comportamiento total</p>
                      </div>

                      {/* Chart Legend */}
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                          <span className="text-gray-700 dark:text-gray-300">Tienda Física / Resto</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                          <span className="text-gray-700 dark:text-gray-300">Canal ONLINE</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-1 bg-dfyf-green rounded-full"></span>
                          <span className="text-gray-700 dark:text-gray-300">Curva Vectorial (Total)</span>
                        </div>
                      </div>
                    </div>

                    {/* SVG Chart Renderer */}
                    {isLoadingAnalytics ? (
                      <div className="h-[360px] flex items-center justify-center text-gray-400 font-bold text-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dfyf-green mr-3"></div>
                        <span>Cargando análisis dinámico...</span>
                      </div>
                    ) : monthlyData.length === 0 ? (
                      <div className="h-[360px] flex items-center justify-center text-gray-400 font-bold text-sm">
                        No hay datos de ventas para el periodo seleccionado.
                      </div>
                    ) : (
                      <div className="relative overflow-x-auto">
                        <svg
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          className="w-full h-auto min-w-[700px] select-none"
                        >
                          {/* Y-Axis Gridlines & Labels */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const yVal = paddingTop + innerH * (1 - ratio);
                            const amountLabel = formatShortCLP(gridMax * ratio);
                            return (
                              <g key={idx}>
                                <line
                                  x1={paddingLeft}
                                  y1={yVal}
                                  x2={chartWidth - paddingRight}
                                  y2={yVal}
                                  stroke="currentColor"
                                  strokeDasharray="4 4"
                                  className="text-gray-200 dark:text-[#055740]/60"
                                />
                                <text
                                  x={paddingLeft - 10}
                                  y={yVal + 4}
                                  textAnchor="end"
                                  className="text-[11px] font-bold fill-gray-400"
                                >
                                  {amountLabel}
                                </text>
                              </g>
                            );
                          })}

                          {/* Columns: Vector Bars */}
                          {monthlyData.map((m: any, idx: number) => {
                            const xCenter = paddingLeft + (idx + 0.5) * stepW;
                            const xLeft = xCenter - barW / 2;
                            
                            const totalH = (m.totalAmount / gridMax) * innerH;
                            const physicalH = (m.physicalAmount / gridMax) * innerH;
                            const onlineH = (m.onlineAmount / gridMax) * innerH;

                            const yBase = paddingTop + innerH;
                            const yPhysical = yBase - physicalH;
                            const yOnline = yPhysical - onlineH;

                            const isHovered = hoveredAnalyticsMonth === idx;

                            return (
                              <g 
                                key={idx} 
                                className="cursor-pointer transition-opacity"
                                onMouseEnter={() => setHoveredAnalyticsMonth(idx)}
                                onMouseLeave={() => setHoveredAnalyticsMonth(null)}
                              >
                                {/* Column hover highlight background */}
                                <rect
                                  x={xCenter - stepW / 2 + 2}
                                  y={paddingTop}
                                  width={stepW - 4}
                                  height={innerH}
                                  fill={isHovered ? "rgba(16, 185, 129, 0.08)" : "transparent"}
                                  rx="8"
                                />

                                {/* Stacked Physical Bar (Bottom) */}
                                {physicalH > 0 && (
                                  <rect
                                    x={xLeft}
                                    y={yPhysical}
                                    width={barW}
                                    height={physicalH}
                                    fill="#10B981"
                                    rx={onlineH > 0 ? 0 : 4}
                                    className="transition-all duration-300 hover:brightness-110"
                                  />
                                )}

                                {/* Stacked Online Bar (Top) */}
                                {onlineH > 0 && (
                                  <rect
                                    x={xLeft}
                                    y={yOnline}
                                    width={barW}
                                    height={onlineH}
                                    fill="#F59E0B"
                                    rx="4"
                                    className="transition-all duration-300 hover:brightness-110"
                                  />
                                )}

                                {/* Amount Text inside/above bar */}
                                {m.totalAmount > 0 && (
                                  <text
                                    x={xCenter}
                                    y={Math.max(paddingTop + 12, yOnline - 8)}
                                    textAnchor="middle"
                                    className="text-[10px] font-black fill-gray-900 dark:fill-white"
                                  >
                                    {formatShortCLP(m.totalAmount)}
                                  </text>
                                )}

                                {/* X-Axis Month Label */}
                                <text
                                  x={xCenter}
                                  y={chartHeight - 15}
                                  textAnchor="middle"
                                  className={`text-[11px] font-bold ${isHovered ? "fill-dfyf-green font-black" : "fill-gray-500 dark:fill-gray-400"}`}
                                >
                                  {m.monthLabel}
                                </text>
                              </g>
                            );
                          })}

                          {/* Vector Trend Path (Curve) */}
                          {vectorPoints.length > 1 && (
                            <path
                              d={curvePathD}
                              fill="none"
                              stroke="#055740"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="dark:stroke-dfyf-green opacity-85"
                            />
                          )}

                          {/* Vector Point Nodes */}
                          {vectorPoints.map((pt, idx) => (
                            <g key={idx}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hoveredAnalyticsMonth === idx ? "6" : "4"}
                                className="fill-dfyf-green stroke-white dark:stroke-[#033b2b] stroke-2 transition-all"
                              />
                            </g>
                          ))}
                        </svg>

                        {/* Floating Dynamic Tooltip Card */}
                        {hoveredAnalyticsMonth !== null && monthlyData[hoveredAnalyticsMonth] && (() => {
                          const m = monthlyData[hoveredAnalyticsMonth];
                          const mPctOnline = m.totalAmount > 0 ? ((m.onlineAmount / m.totalAmount) * 100).toFixed(1) : "0";
                          const mPctPhysical = m.totalAmount > 0 ? ((m.physicalAmount / m.totalAmount) * 100).toFixed(1) : "0";

                          return (
                            <div className="absolute top-2 right-4 bg-gray-950/90 text-white p-3.5 rounded-2xl shadow-xl border border-white/10 text-xs backdrop-blur-md z-20 space-y-1.5 min-w-[220px]">
                              <div className="flex justify-between items-center border-b border-white/15 pb-1 font-black">
                                <span>📅 {m.fullMonthLabel}</span>
                                <span className="text-[10px] text-green-400 font-bold">Detalle Mensual</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300">Monto Total:</span>
                                <span className="font-black text-white">${m.totalAmount.toLocaleString("es-CL")}</span>
                              </div>
                              <div className="flex justify-between items-center text-emerald-400 font-bold">
                                <span>🏬 Tienda Física:</span>
                                <span>${m.physicalAmount.toLocaleString("es-CL")} ({mPctPhysical}%)</span>
                              </div>
                              <div className="flex justify-between items-center text-amber-400 font-bold">
                                <span>🌐 Canal ONLINE:</span>
                                <span>${m.onlineAmount.toLocaleString("es-CL")} ({mPctOnline}%)</span>
                              </div>
                              <div className="border-t border-white/15 pt-1 flex justify-between items-center text-[11px] text-gray-300 font-bold">
                                <span>👞 Pares Vendidos:</span>
                                <span>{m.totalUnits} p. (Online: {m.onlineUnits}, Tienda: {m.physicalUnits})</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Monthly Audit Table */}
                  <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-[#055740] flex justify-between items-center">
                      <h3 className="text-md font-black text-gray-900 dark:text-white">Desglose Numérico por Mes</h3>
                      <span className="text-xs text-gray-400 font-bold">{monthlyData.length} registros</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-50 dark:bg-[#022c20]/50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-[#055740]">
                          <tr>
                            <th className="p-3 pl-5">Mes / Período</th>
                            <th className="p-3 text-right">Monto Total</th>
                            <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">Tienda Física</th>
                            <th className="p-3 text-right text-amber-600 dark:text-amber-400">Canal ONLINE</th>
                            <th className="p-3 text-right">% ONLINE</th>
                            <th className="p-3 text-right pr-5">Pares Vendidos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#055740]/30 font-medium">
                          {monthlyData.map((m: any, idx: number) => {
                            const rowPctOnline = m.totalAmount > 0 ? ((m.onlineAmount / m.totalAmount) * 100).toFixed(1) : "0";
                            return (
                              <tr 
                                key={idx}
                                className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                onMouseEnter={() => setHoveredAnalyticsMonth(idx)}
                                onMouseLeave={() => setHoveredAnalyticsMonth(null)}
                              >
                                <td className="p-3 pl-5 font-black text-gray-900 dark:text-white">{m.fullMonthLabel}</td>
                                <td className="p-3 text-right font-black text-gray-950 dark:text-white">${m.totalAmount.toLocaleString("es-CL")}</td>
                                <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">${m.physicalAmount.toLocaleString("es-CL")}</td>
                                <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">${m.onlineAmount.toLocaleString("es-CL")}</td>
                                <td className="p-3 text-right font-bold text-gray-500">{rowPctOnline}%</td>
                                <td className="p-3 text-right pr-5 font-bold">{m.totalUnits} pares</td>
                              </tr>
                            );
                          })}

                          {monthlyData.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">
                                No hay datos disponibles para el rango seleccionado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4.5: REPORTE POR ESTILOS & PLANIFICACIÓN DE PEDIDOS */}
          {activeTab === "styles" && (() => {
            if (currentUser?.role === "CLERK") {
              return (
                <div className="p-8 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-3xl border border-amber-200 font-bold">
                  🔒 Acceso Restringido. Este reporte de planificación estratégica está disponible únicamente para Administradores.
                </div>
              );
            }

            if (isLoadingStyleReport) {
              return (
                <div className="flex items-center justify-center p-20 text-gray-500 font-bold">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dfyf-green mr-3"></div>
                  Cargando reporte de estilos y curva de tallas...
                </div>
              );
            }

            if (!styleReportData) {
              return (
                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl text-gray-500 font-medium">
                  No se encontraron datos para generar el reporte por estilos.
                </div>
              );
            }

            const { summary, styles } = styleReportData;

            return (
              <div className="h-full overflow-y-auto pr-2 pb-12 space-y-8">
                {/* Header Title */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#033b2b] to-[#044c38] p-8 rounded-3xl text-white shadow-xl">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black rounded-full uppercase tracking-wider">
                        Planificación España
                      </span>
                      <span className="text-xs text-gray-300 font-medium">Exclusivo Admin</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black">Reporte Estratégico por Estilo & Curva de Tallas</h1>
                    <p className="text-sm text-gray-300 mt-1 max-w-2xl font-medium">
                      Análisis de ventas por categoría de calzado y distribución de tallas para optimizar las órdenes de compra a España cada 6 meses.
                    </p>
                  </div>

                  {/* Period Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
                      <button
                        onClick={() => setStylePeriodMode("ALL")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          stylePeriodMode === "ALL"
                            ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20"
                            : "text-gray-300 hover:text-white"
                        }`}
                      >
                        🌐 Todo el Historial
                      </button>
                      <button
                        onClick={() => setStylePeriodMode("FILTER")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          stylePeriodMode === "FILTER"
                            ? "bg-dfyf-green text-white shadow-md shadow-dfyf-green/20"
                            : "text-gray-300 hover:text-white"
                        }`}
                      >
                        📅 Por Período
                      </button>
                    </div>

                    {stylePeriodMode === "FILTER" && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-300 font-bold">Desde:</span>
                          <select
                            value={analyticsFromYear}
                            onChange={(e) => setAnalyticsFromYear(parseInt(e.target.value))}
                            className="bg-white/20 border border-white/20 text-white rounded-lg px-2 py-1 font-bold text-xs cursor-pointer"
                          >
                            <option value="2025" className="text-gray-900">2025</option>
                            <option value="2026" className="text-gray-900">2026</option>
                          </select>
                          <select
                            value={analyticsFromMonth}
                            onChange={(e) => setAnalyticsFromMonth(parseInt(e.target.value))}
                            className="bg-white/20 border border-white/20 text-white rounded-lg px-2 py-1 font-bold text-xs cursor-pointer"
                          >
                            <option value="1" className="text-gray-900">Ene</option>
                            <option value="2" className="text-gray-900">Feb</option>
                            <option value="3" className="text-gray-900">Mar</option>
                            <option value="4" className="text-gray-900">Abr</option>
                            <option value="5" className="text-gray-900">May</option>
                            <option value="6" className="text-gray-900">Jun</option>
                            <option value="7" className="text-gray-900">Jul</option>
                            <option value="8" className="text-gray-900">Ago</option>
                            <option value="9" className="text-gray-900">Sep</option>
                            <option value="10" className="text-gray-900">Oct</option>
                            <option value="11" className="text-gray-900">Nov</option>
                            <option value="12" className="text-gray-900">Dic</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-gray-300 font-bold">Hasta:</span>
                          <select
                            value={analyticsToYear}
                            onChange={(e) => setAnalyticsToYear(parseInt(e.target.value))}
                            className="bg-white/20 border border-white/20 text-white rounded-lg px-2 py-1 font-bold text-xs cursor-pointer"
                          >
                            <option value="2025" className="text-gray-900">2025</option>
                            <option value="2026" className="text-gray-900">2026</option>
                          </select>
                          <select
                            value={analyticsToMonth}
                            onChange={(e) => setAnalyticsToMonth(parseInt(e.target.value))}
                            className="bg-white/20 border border-white/20 text-white rounded-lg px-2 py-1 font-bold text-xs cursor-pointer"
                          >
                            <option value="1" className="text-gray-900">Ene</option>
                            <option value="2" className="text-gray-900">Feb</option>
                            <option value="3" className="text-gray-900">Mar</option>
                            <option value="4" className="text-gray-900">Abr</option>
                            <option value="5" className="text-gray-900">May</option>
                            <option value="6" className="text-gray-900">Jun</option>
                            <option value="7" className="text-gray-900">Jul</option>
                            <option value="8" className="text-gray-900">Ago</option>
                            <option value="9" className="text-gray-900">Sep</option>
                            <option value="10" className="text-gray-900">Oct</option>
                            <option value="11" className="text-gray-900">Nov</option>
                            <option value="12" className="text-gray-900">Dic</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-[#033b2b] p-6 rounded-3xl border border-gray-200 dark:border-[#055740] shadow-sm">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Total Pares Vendidos</span>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">{summary.totalUnits.toLocaleString("es-CL")} <span className="text-sm font-bold text-gray-500">pares</span></div>
                  </div>

                  <div className="bg-white dark:bg-[#033b2b] p-6 rounded-3xl border border-gray-200 dark:border-[#055740] shadow-sm">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Facturación Total Calzado</span>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">${summary.totalRevenue.toLocaleString("es-CL")}</div>
                  </div>

                  <div className="bg-white dark:bg-[#033b2b] p-6 rounded-3xl border border-gray-200 dark:border-[#055740] shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Estilos Abiertos (Verano)</span>
                      <span className="text-xs font-black px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">{summary.openUnitsPct}%</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{summary.openUnits.toLocaleString("es-CL")} <span className="text-xs text-gray-500 font-bold">pares</span></div>
                    <div className="text-xs font-bold text-gray-400 mt-1">${summary.openRevenue.toLocaleString("es-CL")}</div>
                  </div>

                  <div className="bg-white dark:bg-[#033b2b] p-6 rounded-3xl border border-gray-200 dark:border-[#055740] shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Estilos Cerrados (Invierno)</span>
                      <span className="text-xs font-black px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">{summary.closedUnitsPct}%</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{summary.closedUnits.toLocaleString("es-CL")} <span className="text-xs text-gray-500 font-bold">pares</span></div>
                    <div className="text-xs font-bold text-gray-400 mt-1">${summary.closedRevenue.toLocaleString("es-CL")}</div>
                  </div>
                </div>

                {/* Proportional Bar Open vs Closed */}
                <div className="bg-white dark:bg-[#033b2b] p-6 rounded-3xl border border-gray-200 dark:border-[#055740] shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Proporción de Venta: Abiertos (Verano) vs Cerrados (Invierno)</h3>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Abiertos: {summary.openUnitsPct}% ({summary.openUnits} pares)
                      </span>
                      <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span> Cerrados: {summary.closedUnitsPct}% ({summary.closedUnits} pares)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden flex">
                    <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${summary.openUnitsPct}%` }}></div>
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${summary.closedUnitsPct}%` }}></div>
                  </div>
                </div>

                {/* Style Matrix & Size Curve Table */}
                <div className="bg-white dark:bg-[#033b2b] p-6 rounded-3xl border border-gray-200 dark:border-[#055740] shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">Matriz de Curva de Tallas por Estilo</h3>
                      <p className="text-xs text-gray-500 font-medium">Distribución porcentual de pares vendidos para la optimización de pedidos a España.</p>
                    </div>
                    <div className="text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200/50">
                      💡 Las celdas destacadas en verde representan las tallas de mayor demanda (Top Sizes).
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/5 text-gray-500 font-black uppercase tracking-wider border-b border-gray-200 dark:border-[#055740]">
                          <th className="p-3.5 pl-4 rounded-l-2xl">Estilo</th>
                          <th className="p-3.5 text-right">Pares</th>
                          <th className="p-3.5 text-right">% Mix</th>
                          <th className="p-3.5 text-right">Venta</th>
                          {['35', '36', '37', '38', '39', '40', '41', '42'].map(s => (
                            <th key={s} className="p-3 text-center font-black bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{s}</th>
                          ))}
                          <th className="p-3.5 pr-4 rounded-r-2xl min-w-[220px]">Modelo Top Venta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#055740]/30 font-medium">
                        {styles.map((row: any, idx: number) => {
                          const allSizes = ['35', '36', '37', '38', '39', '40', '41', '42'];
                          const maxPct = Math.max(...allSizes.map(sz => row.sizePercentages[sz] || 0));

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors align-middle">
                              <td className="p-3.5 pl-4 font-black text-gray-900 dark:text-white align-middle">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-dfyf-green inline-block shrink-0"></span>
                                  <span>{row.style}</span>
                                </div>
                              </td>
                              <td className="p-3.5 text-right font-black text-gray-900 dark:text-white align-middle">{row.totalUnits.toLocaleString("es-CL")}</td>
                              <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 align-middle">{row.shareOfUnitsPct}%</td>
                              <td className="p-3.5 text-right font-black text-gray-950 dark:text-white align-middle">${row.totalRevenue.toLocaleString("es-CL")}</td>
                              
                              {allSizes.map(sz => {
                                const pct = row.sizePercentages[sz] || 0;
                                const qty = row.sizes[sz] || 0;
                                const isTop = pct > 0 && pct === maxPct;

                                return (
                                  <td 
                                    key={sz} 
                                    className={`p-2 text-center font-bold transition-all align-middle ${
                                      isTop 
                                        ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 font-black rounded-lg" 
                                        : pct > 15 
                                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                                        : "text-gray-600 dark:text-gray-400"
                                    }`}
                                  >
                                    <div>{qty}</div>
                                    <div className="text-[10px] opacity-75 font-semibold">{pct}%</div>
                                  </td>
                                );
                              })}

                              <td className="p-3.5 pr-4 text-gray-700 dark:text-gray-300 font-bold align-middle min-w-[220px]">
                                {row.topModels.length > 0 ? (
                                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 rounded-xl text-xs font-black border border-emerald-200/70 dark:border-emerald-800/70 shadow-sm w-full justify-between">
                                    <span className="truncate">🏆 {row.topModels[0].model}</span>
                                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-[#033b2b] px-2 py-0.5 rounded-md shrink-0 shadow-xs border border-emerald-200 dark:border-emerald-700">
                                      {row.topModels[0].units} un
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-normal">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Strategic Advice Banner */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-6 rounded-3xl text-amber-900 dark:text-amber-200 text-xs font-medium space-y-2">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-300">
                    💡 Recomendación para la Planificación del Próximo Pedido a España:
                  </div>
                  <p className="leading-relaxed">
                    Las tallas **37 y 38** concentran históricamente más del **55%** de las ventas totales en calzado. Se recomienda ajustar la curva de pedido enviando a fábrica en España un ratio sugerido de **1-2-4-4-3-2-1** para las tallas [35-36-37-38-39-40-41] por cada lote de 17 pares.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* TAB 4.8: ANÁLISIS DE STOCK EN BODEGA */}
          {activeTab === "stock" && (() => {
            if (currentUser?.role === "CLERK") {
              return (
                <div className="p-8 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-3xl border border-amber-200 font-bold">
                  🔒 Acceso Restringido. Este reporte de análisis de inventario está disponible únicamente para Administradores.
                </div>
              );
            }

            if (isLoadingStockReport) {
              return (
                <div className="flex items-center justify-center p-20 text-gray-500 font-bold">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dfyf-green mr-3"></div>
                  Cargando análisis de stock en bodega...
                </div>
              );
            }

            if (!stockReportData) {
              return (
                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl text-gray-500 font-medium">
                  No se encontraron datos de inventario en bodega.
                </div>
              );
            }

            const { summary, byStyle, byModel } = stockReportData;

            const handleSort = (col: string) => {
              if (stockSortColumn === col) {
                setStockSortDir(stockSortDir === "asc" ? "desc" : "asc");
              } else {
                setStockSortColumn(col);
                setStockSortDir("desc");
              }
            };

            const getSortedData = (items: any[]) => {
              return [...items].sort((a, b) => {
                let valA: any = 0;
                let valB: any = 0;

                if (stockSortColumn === "style") {
                  valA = (a.style || "").toLowerCase();
                  valB = (b.style || "").toLowerCase();
                  return stockSortDir === "asc"
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
                } else if (stockSortColumn === "model" || stockSortColumn === "name") {
                  valA = (a.model || "").toLowerCase();
                  valB = (b.model || "").toLowerCase();
                  return stockSortDir === "asc"
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
                } else if (stockSortColumn === "total") {
                  valA = a.total || 0;
                  valB = b.total || 0;
                } else if (stockSortColumn === "originalPrice") {
                  valA = a.originalPrice || a.price || 0;
                  valB = b.originalPrice || b.price || 0;
                } else if (stockSortColumn === "currentPrice") {
                  valA = a.currentPrice || a.price || 0;
                  valB = b.currentPrice || b.price || 0;
                } else if (stockSortColumn === "discount") {
                  valA = a.discount || 0;
                  valB = b.discount || 0;
                } else {
                  valA = a.sizes[stockSortColumn] || 0;
                  valB = b.sizes[stockSortColumn] || 0;
                }

                return stockSortDir === "asc" ? valA - valB : valB - valA;
              });
            };

            const filteredStockItems = byModel.filter((item: any) => {
              if (stockModelSearchQuery.trim() !== "") {
                const query = stockModelSearchQuery.trim().toLowerCase();
                const modelName = (item.model || item.name || "").toLowerCase();
                if (!modelName.includes(query)) {
                  return false;
                }
              }
              const itemStyle = item.style || item.family || "";
              if (selectedStockStyles.length > 0 && !selectedStockStyles.includes(itemStyle)) {
                return false;
              }
              if (selectedStockDiscounts.length > 0) {
                const itemDisc = item.discount || 0;
                if (!selectedStockDiscounts.includes(itemDisc)) {
                  return false;
                }
              }
              if (selectedStockQtys.length > 0) {
                const itemQty = item.total || 0;
                if (!selectedStockQtys.includes(itemQty)) {
                  return false;
                }
              }
              return true;
            });

            const filteredStockPairsTotal = filteredStockItems.reduce((acc: number, item: any) => acc + (item.total || 0), 0);

            const allSizes = ["35", "36", "37", "38", "39", "40", "41", "42"];

            return (
              <div className="h-full overflow-y-auto pr-2 pb-12 space-y-4">
                {/* Compact Header Title & Summary Metric Cards */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-gradient-to-r from-[#033b2b] to-[#044c38] p-4 px-6 rounded-2xl text-white shadow-md">
                  <div>
                    <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                      <span>📦</span> Stock y Tallas en Bodega
                    </h1>
                  </div>

                  {/* Compact Inline KPI Badges & Action Button */}
                  <div className="flex items-center gap-3 flex-wrap shrink-0">
                    <div className="bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Stock Total:</span>
                      <span className="text-sm font-black text-white">{summary.totalStock.toLocaleString("es-CL")} <span className="text-[10px] font-bold text-gray-300">un.</span></span>
                    </div>

                    <div className="bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Modelos Únicos:</span>
                      <span className="text-sm font-black text-white">{summary.totalModels}</span>
                    </div>

                    <div className="bg-emerald-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-400/40 flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Modelos Filtrados:
                      </span>
                      <span className="text-sm font-black text-white">{filteredStockItems.length}</span>
                    </div>

                    <div className="bg-emerald-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-400/40 flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                        Pares Filtrados:
                      </span>
                      <span className="text-sm font-black text-white">{filteredStockPairsTotal.toLocaleString("es-CL")} <span className="text-[10px] font-bold text-emerald-200">un.</span></span>
                    </div>

                    <button
                      onClick={() => {
                        setPriceAdjustmentResult(null);
                        setSelectedDiscountPercent("");
                        setCustomShopifyTag("");
                        setIsAdjustPriceModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title="Adecuar precios o descuentos para todos los modelos filtrados"
                    >
                      <span>🏷️</span> Adecuar Precio
                    </button>
                  </div>
                </div>

                {/* UNIFIED MATRIX BY MODEL TABLE */}
                {(() => {
                  const rawItems = byModel;

                  // Dynamic Filter Options derived from actual dataset
                  const uniqueStyles: string[] = Array.from(new Set<string>(rawItems.map((item: any) => (item.style || "Calzado General") as string)))
                    .sort();
                  const uniqueDiscounts: number[] = Array.from(new Set<number>(rawItems.map((item: any) => (item.discount || 0) as number)))
                    .sort((a, b) => a - b);
                  const uniqueStockQtys: number[] = Array.from(new Set<number>(rawItems.map((item: any) => (item.total || 0) as number)))
                    .sort((a, b) => a - b);

                  const filteredItems = rawItems.filter((item: any) => {
                    // Instant Model Search Filter
                    if (stockModelSearchQuery.trim() !== "") {
                      const query = stockModelSearchQuery.trim().toLowerCase();
                      const modelName = (item.model || item.name || "").toLowerCase();
                      if (!modelName.includes(query)) {
                        return false;
                      }
                    }

                    // Style Filter
                    const itemStyle = item.style || item.family || "";
                    if (selectedStockStyles.length > 0 && !selectedStockStyles.includes(itemStyle)) {
                      return false;
                    }

                    // Multi-select Discount Filter
                    if (selectedStockDiscounts.length > 0) {
                      const itemDisc = item.discount || 0;
                      if (!selectedStockDiscounts.includes(itemDisc)) {
                        return false;
                      }
                    }

                    // Multi-select Stock Filter
                    if (selectedStockQtys.length > 0) {
                      const itemQty = item.total || 0;
                      if (!selectedStockQtys.includes(itemQty)) {
                        return false;
                      }
                    }

                    return true;
                  });

                  const sortedItems = getSortedData(filteredItems);

                  return (
                    <div className="bg-white dark:bg-[#033b2b] p-4 rounded-2xl border border-gray-200 dark:border-[#055740] shadow-sm space-y-3">
                      {/* Instant Model Search Bar Toolbar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/80 dark:bg-[#022c20]/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-[#055740]/60 shadow-xs">
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">🔍</span>
                          <input
                            type="text"
                            value={stockModelSearchQuery}
                            onChange={(e) => setStockModelSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre de modelo... (ej. Boi, Aneto, Ordesa)"
                            className="w-full pl-9 pr-9 py-2 text-xs font-bold bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white border border-gray-200 dark:border-[#055740] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-gray-400 font-medium"
                          />
                          {stockModelSearchQuery.trim() !== "" && (
                            <button
                              onClick={() => setStockModelSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs font-black cursor-pointer p-0.5"
                              title="Limpiar búsqueda"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                            Mostrando <strong className="text-emerald-600 dark:text-emerald-300 font-black">{filteredItems.length}</strong> de {rawItems.length} modelos
                          </span>
                        </div>
                      </div>

                      {/* Active Filter Badges */}
                      {(selectedStockStyles.length > 0 || selectedStockDiscounts.length > 0 || selectedStockQtys.length > 0 || stockModelSearchQuery.trim() !== "") && (
                        <div className="flex items-center gap-2 flex-wrap bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                            🔍 Filtros Activos:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {stockModelSearchQuery.trim() !== "" && (
                              <span 
                                className="inline-flex items-center gap-1 bg-white dark:bg-[#033b2b] text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm"
                              >
                                Modelo: "{stockModelSearchQuery.trim()}"
                                <button
                                  onClick={() => setStockModelSearchQuery("")}
                                  className="hover:text-red-500 font-black cursor-pointer ml-0.5"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            {selectedStockStyles.map((style) => (
                              <span 
                                key={style}
                                className="inline-flex items-center gap-1 bg-white dark:bg-[#033b2b] text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm"
                              >
                                Estilo: {style}
                                <button
                                  onClick={() => setSelectedStockStyles(selectedStockStyles.filter(s => s !== style))}
                                  className="hover:text-red-500 font-black cursor-pointer ml-0.5"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            {selectedStockDiscounts.map((d) => (
                              <span 
                                key={`disc_${d}`}
                                className="inline-flex items-center gap-1 bg-white dark:bg-[#033b2b] text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm"
                              >
                                Dcto: {d === 0 ? "Sin Descuento" : `${d}%`}
                                <button
                                  onClick={() => setSelectedStockDiscounts(selectedStockDiscounts.filter(val => val !== d))}
                                  className="hover:text-red-500 font-black cursor-pointer ml-0.5"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            {selectedStockQtys.map((q) => (
                              <span 
                                key={`qty_${q}`}
                                className="inline-flex items-center gap-1 bg-white dark:bg-[#033b2b] text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm"
                              >
                                Stock: {q === 0 ? "0 pares" : `${q} ${q === 1 ? "par" : "pares"}`}
                                <button
                                  onClick={() => setSelectedStockQtys(selectedStockQtys.filter(val => val !== q))}
                                  className="hover:text-red-500 font-black cursor-pointer ml-0.5"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            <button
                              onClick={() => {
                                setSelectedStockStyles([]);
                                setSelectedStockDiscounts([]);
                                setSelectedStockQtys([]);
                              }}
                              className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                            >
                              Limpiar Todos
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-white/5 text-gray-500 font-black uppercase tracking-wider border-b border-gray-200 dark:border-[#055740]">
                              {/* 1. ESTILO (With Inline Multi-Select Filter Dropdown) */}
                              <th className="p-3.5 text-left relative select-none rounded-l-2xl">
                                <div className="flex items-center justify-start gap-1">
                                  <span 
                                    onClick={() => handleSort("style")} 
                                    className="cursor-pointer hover:text-dfyf-green transition-colors"
                                  >
                                    Estilo
                                    {stockSortColumn === "style" && (stockSortDir === "asc" ? " ↑" : " ↓")}
                                  </span>
                                  <button
                                    onClick={(e) => openStockDropdown("style", e)}
                                    className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                      selectedStockStyles.length > 0 ? "text-dfyf-green font-black bg-emerald-100 dark:bg-emerald-950 border border-emerald-400" : "text-gray-400"
                                    }`}
                                    title="Filtrar por Estilo"
                                  >
                                    ⚙️
                                  </button>
                                </div>

                                {isStockStyleDropdownOpen && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsStockStyleDropdownOpen(false)} />
                                    <div 
                                      className="fixed w-64 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl shadow-2xl p-3 z-50 text-xs text-left text-gray-900 dark:text-white space-y-2"
                                      style={{ top: `${stockDropdownPos.top}px`, left: `${stockDropdownPos.left}px` }}
                                    >
                                      <div className="flex justify-between items-center pb-1.5 border-b border-gray-100 dark:border-[#055740]">
                                        <span className="font-black text-[11px] uppercase tracking-wider text-gray-400">
                                          Filtrar Estilos ({selectedStockStyles.length === 0 ? "Todos" : selectedStockStyles.length})
                                        </span>
                                        {selectedStockStyles.length > 0 && (
                                          <button
                                            onClick={() => setSelectedStockStyles([])}
                                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                          >
                                            Ver Todos
                                          </button>
                                        )}
                                      </div>

                                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                        <label className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold">
                                          <input
                                            type="checkbox"
                                            checked={selectedStockStyles.length === 0}
                                            onChange={() => setSelectedStockStyles([])}
                                            className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                                          />
                                          <span>🌐 Todos los Estilos</span>
                                        </label>

                                        {uniqueStyles.map((st) => {
                                          const isChecked = selectedStockStyles.includes(st);
                                          return (
                                            <label 
                                              key={st} 
                                              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={selectedStockStyles.length > 0 && isChecked}
                                                onChange={() => {
                                                  if (selectedStockStyles.length === 0) {
                                                    setSelectedStockStyles([st]);
                                                  } else if (isChecked) {
                                                    setSelectedStockStyles(selectedStockStyles.filter(val => val !== st));
                                                  } else {
                                                    setSelectedStockStyles([...selectedStockStyles, st]);
                                                  }
                                                }}
                                                className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                                              />
                                              <span>👠 {st}</span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      <div className="pt-2 border-t border-gray-100 dark:border-[#055740] flex justify-end">
                                        <button
                                          onClick={() => setIsStockStyleDropdownOpen(false)}
                                          className="px-3 py-1 bg-dfyf-green text-white text-xs font-black rounded-lg cursor-pointer hover:bg-dfyf-green/90"
                                        >
                                          Listo
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </th>

                              {/* 2. MODELO */}
                              <th 
                                onClick={() => handleSort("model")}
                                className="p-3.5 text-left cursor-pointer hover:text-dfyf-green transition-colors"
                              >
                                <div className="flex items-center justify-start gap-1">
                                  Modelo
                                  {(stockSortColumn === "model" || stockSortColumn === "name") && (stockSortDir === "asc" ? " ↑" : " ↓")}
                                </div>
                              </th>

                              {/* 3. PRECIO */}
                              <th 
                                onClick={() => handleSort("originalPrice")}
                                className="p-3.5 text-right cursor-pointer hover:text-dfyf-green transition-colors"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Precio
                                  {stockSortColumn === "originalPrice" && (stockSortDir === "asc" ? " ↑" : " ↓")}
                                </div>
                              </th>

                              {/* 4. P. ACTUAL */}
                              <th 
                                onClick={() => handleSort("currentPrice")}
                                className="p-3.5 text-right cursor-pointer hover:text-dfyf-green transition-colors"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  P. Actual
                                  {stockSortColumn === "currentPrice" && (stockSortDir === "asc" ? " ↑" : " ↓")}
                                </div>
                              </th>

                              {/* 5. DCTO % (With Inline Multi-Select Filter Dropdown) */}
                              <th className="p-3.5 text-center relative select-none">
                                <div className="flex items-center justify-center gap-1">
                                  <span 
                                    onClick={() => handleSort("discount")} 
                                    className="cursor-pointer hover:text-dfyf-green transition-colors"
                                  >
                                    Dcto %
                                    {stockSortColumn === "discount" && (stockSortDir === "asc" ? " ↑" : " ↓")}
                                  </span>
                                  <button
                                    onClick={(e) => openStockDropdown("discount", e)}
                                    className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                      selectedStockDiscounts.length > 0 ? "text-dfyf-green font-black bg-emerald-100 dark:bg-emerald-950 border border-emerald-400" : "text-gray-400"
                                    }`}
                                    title="Filtrar por Descuento"
                                  >
                                    ⚙️
                                  </button>
                                </div>

                                {isStockDiscountDropdownOpen && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsStockDiscountDropdownOpen(false)} />
                                    <div 
                                      className="fixed w-64 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl shadow-2xl p-3 z-50 text-xs text-left text-gray-900 dark:text-white space-y-2"
                                      style={{ top: `${stockDropdownPos.top}px`, left: `${stockDropdownPos.left}px` }}
                                    >
                                      <div className="flex justify-between items-center pb-1.5 border-b border-gray-100 dark:border-[#055740]">
                                        <span className="font-black text-[11px] uppercase tracking-wider text-gray-400">
                                          Filtrar Descuentos ({selectedStockDiscounts.length === 0 ? "Todos" : selectedStockDiscounts.length})
                                        </span>
                                        {selectedStockDiscounts.length > 0 && (
                                          <button
                                            onClick={() => setSelectedStockDiscounts([])}
                                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                          >
                                            Ver Todos
                                          </button>
                                        )}
                                      </div>

                                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                        <label className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold">
                                          <input
                                            type="checkbox"
                                            checked={selectedStockDiscounts.length === 0}
                                            onChange={() => setSelectedStockDiscounts([])}
                                            className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                                          />
                                          <span>🌐 Todos los Descuentos</span>
                                        </label>

                                        {uniqueDiscounts.map((d) => {
                                          const isChecked = selectedStockDiscounts.includes(d);
                                          return (
                                            <label 
                                              key={d} 
                                              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={selectedStockDiscounts.length > 0 && isChecked}
                                                onChange={() => {
                                                  if (selectedStockDiscounts.length === 0) {
                                                    setSelectedStockDiscounts([d]);
                                                  } else if (isChecked) {
                                                    setSelectedStockDiscounts(selectedStockDiscounts.filter(val => val !== d));
                                                  } else {
                                                    setSelectedStockDiscounts([...selectedStockDiscounts, d]);
                                                  }
                                                }}
                                                className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                                              />
                                              <span>{d === 0 ? "🏷️ Sin Descuento (0%)" : `🏷️ ${d}% de Descuento`}</span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      <div className="pt-2 border-t border-gray-100 dark:border-[#055740] flex justify-end">
                                        <button
                                          onClick={() => setIsStockDiscountDropdownOpen(false)}
                                          className="px-3 py-1 bg-dfyf-green text-white text-xs font-black rounded-lg cursor-pointer hover:bg-dfyf-green/90"
                                        >
                                          Listo
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </th>

                              {/* 6. STOCK (With Inline Multi-Select Filter Dropdown) */}
                              <th className="p-3.5 text-center relative select-none">
                                <div className="flex items-center justify-center gap-1">
                                  <span 
                                    onClick={() => handleSort("total")} 
                                    className="cursor-pointer hover:text-dfyf-green transition-colors"
                                  >
                                    Stock
                                    {stockSortColumn === "total" && (stockSortDir === "asc" ? " ↑" : " ↓")}
                                  </span>
                                  <button
                                    onClick={(e) => openStockDropdown("qty", e)}
                                    className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                      selectedStockQtys.length > 0 ? "text-dfyf-green font-black bg-emerald-100 dark:bg-emerald-950 border border-emerald-400" : "text-gray-400"
                                    }`}
                                    title="Filtrar por Stock"
                                  >
                                    ⚙️
                                  </button>
                                </div>

                                {isStockQtyDropdownOpen && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsStockQtyDropdownOpen(false)} />
                                    <div 
                                      className="fixed w-60 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl shadow-2xl p-3 z-50 text-xs text-left text-gray-900 dark:text-white space-y-2"
                                      style={{ top: `${stockDropdownPos.top}px`, left: `${stockDropdownPos.left}px` }}
                                    >
                                      <div className="flex justify-between items-center pb-1.5 border-b border-gray-100 dark:border-[#055740]">
                                        <span className="font-black text-[11px] uppercase tracking-wider text-gray-400">
                                          Filtrar Stock ({selectedStockQtys.length === 0 ? "Todos" : selectedStockQtys.length})
                                        </span>
                                        {selectedStockQtys.length > 0 && (
                                          <button
                                            onClick={() => setSelectedStockQtys([])}
                                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                          >
                                            Ver Todos
                                          </button>
                                        )}
                                      </div>

                                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                        <label className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold">
                                          <input
                                            type="checkbox"
                                            checked={selectedStockQtys.length === 0}
                                            onChange={() => setSelectedStockQtys([])}
                                            className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                                          />
                                          <span>🌐 Todos los Stocks</span>
                                        </label>

                                        {uniqueStockQtys.map((q) => {
                                          const isChecked = selectedStockQtys.includes(q);
                                          const labelText = q === 0 ? "🚫 0 pares (Sin Stock)" : `📦 ${q} ${q === 1 ? "par" : "pares"}`;
                                          return (
                                            <label 
                                              key={q} 
                                              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={selectedStockQtys.length > 0 && isChecked}
                                                onChange={() => {
                                                  if (selectedStockQtys.length === 0) {
                                                    setSelectedStockQtys([q]);
                                                  } else if (isChecked) {
                                                    setSelectedStockQtys(selectedStockQtys.filter(val => val !== q));
                                                  } else {
                                                    setSelectedStockQtys([...selectedStockQtys, q]);
                                                  }
                                                }}
                                                className="w-4 h-4 accent-dfyf-green rounded cursor-pointer shrink-0"
                                              />
                                              <span>{labelText}</span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      <div className="pt-2 border-t border-gray-100 dark:border-[#055740] flex justify-end">
                                        <button
                                          onClick={() => setIsStockQtyDropdownOpen(false)}
                                          className="px-3 py-1 bg-dfyf-green text-white text-xs font-black rounded-lg cursor-pointer hover:bg-dfyf-green/90"
                                        >
                                          Listo
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </th>

                              {/* 7. TALLAS: 35, 36, ..., 42 */}
                              {allSizes.map(sz => (
                                <th 
                                  key={sz} 
                                  onClick={() => handleSort(sz)}
                                  className="p-3.5 text-center font-black bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                                >
                                  {sz}
                                  {stockSortColumn === sz && (stockSortDir === "asc" ? " ↑" : " ↓")}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#055740]/30 font-medium">
                            {sortedItems.map((row: any, idx: number) => {
                              const hasDiscount = (row.discount || 0) > 0;
                              return (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors align-middle">
                                  {/* ESTILO */}
                                  <td className="p-3.5 text-left font-bold text-gray-700 dark:text-gray-200 align-middle">
                                    {row.style}
                                  </td>

                                  {/* MODELO */}
                                  <td className="p-3.5 text-left font-black text-gray-900 dark:text-white align-middle">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-dfyf-green inline-block shrink-0"></span>
                                      <span>{row.model}</span>
                                    </div>
                                  </td>

                                  {/* PRECIO */}
                                  <td className={`p-3.5 text-right align-middle text-xs ${
                                    hasDiscount ? "font-semibold text-gray-400 dark:text-gray-400 line-through" : "font-bold text-gray-700 dark:text-gray-200"
                                  }`}>
                                    ${(row.originalPrice || row.price || 0).toLocaleString("es-CL")}
                                  </td>

                                  {/* P. ACTUAL */}
                                  <td className="p-3.5 text-right font-black text-gray-900 dark:text-white align-middle text-xs">
                                    ${(row.currentPrice || row.price || 0).toLocaleString("es-CL")}
                                  </td>

                                  {/* DCTO % */}
                                  <td className="p-3.5 text-center align-middle">
                                    {hasDiscount ? (
                                      <span className="inline-block bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-black text-[11px] px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-sm">
                                        {row.discount}%
                                      </span>
                                    ) : null}
                                  </td>

                                  {/* STOCK */}
                                  <td className="p-3.5 text-center font-black text-emerald-600 dark:text-emerald-400 align-middle text-sm">
                                    {row.total.toLocaleString("es-CL")}
                                  </td>

                                  {/* TALLAS */}
                                  {allSizes.map(sz => {
                                    const qty = row.sizes[sz] || 0;
                                    return (
                                      <td 
                                        key={sz} 
                                        className={`p-3 text-center font-bold transition-all align-middle ${
                                          qty > 0 
                                            ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-black" 
                                            : "text-gray-300 dark:text-gray-600"
                                        }`}
                                      >
                                        {qty}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ADECUAR PRECIO DE MODELOS FILTRADOS POPUP MODAL */}
                      {isAdjustPriceModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-7 max-w-2xl w-full shadow-2xl space-y-6">
                      {/* Modal Header */}
                      <div className="flex justify-between items-start border-b border-gray-100 dark:border-[#055740] pb-4">
                        <div>
                          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <span>🏷️</span> Adecuar Precio de Modelos Filtrados
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Modificación masiva de precios base para los <strong className="text-emerald-600 dark:text-emerald-400">{filteredStockItems.length} modelos</strong> actualmente filtrados en la matriz.
                          </p>
                        </div>
                        <button
                          onClick={() => setIsAdjustPriceModalOpen(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Main Grid: Left Model List, Right Action Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                        {/* Left Column (5 cols): Filtered Models List */}
                        <div className="md:col-span-5 bg-gray-50 dark:bg-[#022c20]/50 border border-gray-200 dark:border-[#055740] rounded-2xl p-4 flex flex-col justify-between space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200/80 dark:border-[#055740]/60">
                            <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-300">Modelos Afectados</span>
                            <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              {filteredStockItems.length} modelos
                            </span>
                          </div>

                          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                            {filteredStockItems.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4 font-bold">No hay modelos en la selección actual.</p>
                            ) : (
                              filteredStockItems.map((item: any, idx: number) => (
                                <div key={idx} className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 py-1 px-2.5 bg-white dark:bg-[#033b2b] rounded-xl border border-gray-200/60 dark:border-[#055740]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  <span className="truncate">{item.model}</span>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-200/80 dark:border-[#055740]/60 text-[10px] text-gray-400 font-medium">
                            * El cambio afectará a todas las tallas de estos modelos en Shopify y BD.
                          </div>
                        </div>

                        {/* Right Column (7 cols): Action Controls */}
                        <div className="md:col-span-7 space-y-4 flex flex-col justify-between">
                          {/* Action 1: Eliminar Descuento */}
                          <div className="bg-gray-50 dark:bg-[#022c20]/30 border border-gray-200/80 dark:border-[#055740]/50 rounded-2xl p-4 space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Acción A: Eliminar Descuento</span>
                              <span className="text-[10px] font-bold text-gray-400">0% Dcto</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              Igualar el Precio Base al Precio Comparación en todas las variantes de los modelos filtrados (dejar sin descuento).
                            </p>
                            <button
                              disabled={isApplyingPriceAdjustment || filteredStockItems.length === 0}
                              onClick={async () => {
                                setIsApplyingPriceAdjustment(true);
                                setPriceAdjustmentResult(null);
                                try {
                                  const res = await fetch(`${API_BASE_URL}/shopify/bulk-adjust-prices`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'admin' },
                                    body: JSON.stringify({
                                      modelNames: filteredStockItems.map((i: any) => i.model),
                                      discountPercentage: 0,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    setPriceAdjustmentResult({
                                      success: true,
                                      message: `¡Se eliminó el descuento exitosamente! (${data.updatedVariantsCount} variantes de ${data.updatedModelsCount} modelos actualizadas en Shopify y BD).`,
                                    });
                                    fetchStockReport();
                                  } else {
                                    setPriceAdjustmentResult({
                                      success: false,
                                      message: data.errors?.[0] || 'Error al eliminar descuento.',
                                    });
                                  }
                                } catch (err: any) {
                                  setPriceAdjustmentResult({ success: false, message: err.message || 'Error de conexión.' });
                                } finally {
                                  setIsApplyingPriceAdjustment(false);
                                }
                              }}
                              className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <span>🏷️</span> Eliminar Descuento (0%)
                            </button>
                          </div>

                          {/* Action 2: Asignar Descuento */}
                          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">Acción B: Asignar Descuento %</span>
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">10% a 50%</span>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block">Selecciona el Porcentaje:</label>
                              <select
                                value={selectedDiscountPercent}
                                onChange={(e) => setSelectedDiscountPercent(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full border border-gray-300 dark:border-[#055740] rounded-xl px-3 py-2 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-bold h-9 cursor-pointer"
                              >
                                <option value="">Seleccionar descuento...</option>
                                <option value="10">10% de descuento</option>
                                <option value="15">15% de descuento</option>
                                <option value="20">20% de descuento</option>
                                <option value="25">25% de descuento</option>
                                <option value="30">30% de descuento</option>
                                <option value="35">35% de descuento</option>
                                <option value="40">40% de descuento</option>
                                <option value="45">45% de descuento</option>
                                <option value="50">50% de descuento</option>
                              </select>
                            </div>

                            <div className="space-y-1 pt-1">
                              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <span>🏷️</span> Etiqueta para Shopify (Opcional):
                              </label>
                              <input
                                type="text"
                                value={customShopifyTag}
                                onChange={(e) => setCustomShopifyTag(e.target.value)}
                                placeholder="Ej: Rebajas 2026, Venta Especial (opcional)"
                                className="w-full border border-gray-300 dark:border-[#055740] rounded-xl px-3 py-2 text-xs bg-white dark:bg-[#033b2b] text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400"
                              />
                              <span className="text-[10px] text-gray-400 block font-normal">
                                * Se agregará esta etiqueta en Shopify a los modelos filtrados preservando las anteriores.
                              </span>
                            </div>

                            <button
                              disabled={selectedDiscountPercent === "" || isApplyingPriceAdjustment || filteredStockItems.length === 0}
                              onClick={async () => {
                                if (selectedDiscountPercent === "") return;
                                setIsApplyingPriceAdjustment(true);
                                setPriceAdjustmentResult(null);
                                try {
                                  const res = await fetch(`${API_BASE_URL}/shopify/bulk-adjust-prices`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'admin' },
                                    body: JSON.stringify({
                                      modelNames: filteredStockItems.map((i: any) => i.model),
                                      discountPercentage: Number(selectedDiscountPercent),
                                      tag: customShopifyTag.trim() || undefined,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    setPriceAdjustmentResult({
                                      success: true,
                                      message: `¡Se asignó el ${selectedDiscountPercent}% de descuento exitosamente! (${data.updatedVariantsCount} variantes de ${data.updatedModelsCount} modelos actualizadas en Shopify y BD${customShopifyTag.trim() ? ` con etiqueta "${customShopifyTag.trim()}"` : ''}).`,
                                    });
                                    fetchStockReport();
                                  } else {
                                    setPriceAdjustmentResult({
                                      success: false,
                                      message: data.errors?.[0] || 'Error al aplicar descuento.',
                                    });
                                  }
                                } catch (err: any) {
                                  setPriceAdjustmentResult({ success: false, message: err.message || 'Error de conexión.' });
                                } finally {
                                  setIsApplyingPriceAdjustment(false);
                                }
                              }}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 flex items-center justify-center gap-2"
                            >
                              <span>%</span> Asignar Descuento
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Loading State or Feedback Alert */}
                      {isApplyingPriceAdjustment && (
                        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3.5 rounded-2xl flex items-center gap-3">
                          <span className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0"></span>
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                            Actualizando precios en Shopify y Base de Datos local... por favor espere.
                          </span>
                        </div>
                      )}

                      {priceAdjustmentResult && (
                        <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                          priceAdjustmentResult.success 
                            ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200" 
                            : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
                        }`}>
                          <span>{priceAdjustmentResult.success ? "✅" : "⚠️"}</span>
                          <span>{priceAdjustmentResult.message}</span>
                        </div>
                      )}

                      {/* Modal Actions */}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setIsAdjustPriceModalOpen(false)}
                          className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-[#044c38] dark:hover:bg-[#055740] text-gray-800 dark:text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      );
    })()}

          {/* TAB 5: ADMIN PANEL */}
          {activeTab === "admin" && (
            <div className="h-full overflow-y-auto pr-2 pb-12">
              <div className="space-y-8 pb-8">
              
              {/* Personal management */}
              <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 shadow-sm">
                <h2 className="text-xl font-black mb-1">Administración de Personal (Usuarios)</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Administra las cuentas de administradores y vendedoras, asignándolos a sus tiendas correspondientes.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Form */}
                  <form onSubmit={handleCreateUser} className="space-y-4 lg:col-span-1 border-r border-gray-100 dark:border-[#055740] pr-0 lg:pr-8">
                    <h3 className="font-bold text-lg mb-2">{editingUserId ? "Editar Usuario" : "Crear Nuevo Usuario"}</h3>
                    
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Nombre Completo</label>
                      <input 
                        type="text" 
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Ej. Camila Gatica" 
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Correo Electrónico</label>
                      <input 
                        type="email" 
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="ejemplo@gmail.com" 
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">
                        Contraseña {editingUserId ? "(Opcional)" : "(Requerida)"}
                      </label>
                      <input 
                        type="password" 
                        required={!editingUserId}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder={editingUserId ? "Dejar en blanco para no cambiar" : "Contraseña"} 
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Rol de Sistema</label>
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as any)}
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none cursor-pointer"
                      >
                        {currentUser.role === "SUPER_ADMIN" && (
                          <option value="COUNTRY_ADMIN">ADMINISTRADOR TIENDA</option>
                        )}
                        <option value="CLERK">VENDEDOR</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Asignar Tiendas (Selección Múltiple)</label>
                      <div className="border border-gray-200 dark:border-[#055740] rounded-xl p-3 max-h-32 overflow-y-auto space-y-2 bg-[#F9FAFB] dark:bg-[#022c20]">
                        {stores.map((s) => (
                          <label key={s.id} className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={newUserStoreIds.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewUserStoreIds([...newUserStoreIds, s.id]);
                                } else {
                                  setNewUserStoreIds(newUserStoreIds.filter(id => id !== s.id));
                                }
                              }}
                              className="rounded border-gray-300 text-dfyf-green focus:ring-dfyf-green"
                            />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {userActionError && (
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl text-center">
                        {userActionError}
                      </div>
                    )}

                    {userActionSuccess && (
                      <div className="p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 text-xs font-bold rounded-xl text-center">
                        {userActionSuccess}
                      </div>
                    )}

                    <div className="space-y-2">
                      <button 
                        type="submit"
                        className="w-full bg-dfyf-green hover:bg-[#046c4e] text-white font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        {editingUserId ? "Guardar Cambios" : "Crear Usuario"}
                      </button>

                      {editingUserId && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingUserId(null);
                            setNewUserName("");
                            setNewUserEmail("");
                            setNewUserPassword("");
                            setNewUserStoreIds([]);
                            setUserActionError("");
                            setUserActionSuccess("");
                          }}
                          className="w-full border border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-200 font-bold py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#055740] transition-all cursor-pointer text-xs"
                        >
                          Cancelar Edición
                        </button>
                      )}
                    </div>
                  </form>

                  {/* List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-lg">Personal Registrado</h3>
                    <div className="border border-gray-100 dark:border-[#055740] rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-[#044c38] border-b border-gray-100 dark:border-[#055740] text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Rol</th>
                            <th className="p-3">Tiendas Asignadas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr 
                              key={u.id} 
                              onClick={() => handleEditUserClick(u)}
                              className="border-b border-gray-100 dark:border-[#055740] last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all cursor-pointer"
                              title="Haz clic para editar los datos de este usuario"
                            >
                              <td className="p-3 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span>{u.name}</span>
                                <span className="text-[10px] text-gray-400 opacity-0 hover:opacity-100 transition-opacity">✏️</span>
                              </td>
                              <td className="p-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  u.role === "SUPER_ADMIN" 
                                    ? "bg-purple-100 text-purple-700" 
                                    : u.role === "COUNTRY_ADMIN" 
                                      ? "bg-blue-100 text-blue-700" 
                                      : "bg-green-100 text-green-700"
                                }`}>
                                  {u.role === "SUPER_ADMIN" ? "ADMIN" : u.role === "COUNTRY_ADMIN" ? "Admin Tienda" : "Vendedor"}
                                </span>
                              </td>
                              <td className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                                {u.stores?.map(s => s.store.name).join(", ") || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stores panel (only SUPER_ADMIN/Maestro) */}
              {currentUser.role === "SUPER_ADMIN" && (
                <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-3xl p-8 shadow-sm">
                  <h2 className="text-xl font-black mb-1">Administración de Tiendas / Bodegas</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Crea sucursales físicas y asócialas a sus correspondientes cuentas de Shopify para sincronización de stock aislada.</p>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <form onSubmit={handleCreateStore} className="space-y-4 lg:col-span-1 border-r border-gray-100 dark:border-[#055740] pr-0 lg:pr-8">
                      <h3 className="font-bold text-lg mb-2">Crear Nueva Tienda</h3>
                      
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Nombre de la Sucursal</label>
                        <input 
                          type="text" 
                          required
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          placeholder="Ej. Costanera Center" 
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">Dirección</label>
                        <input 
                          type="text" 
                          value={newStoreAddress}
                          onChange={(e) => setNewStoreAddress(e.target.value)}
                          placeholder="Calle / Local" 
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">País</label>
                        <select 
                          value={newStoreCountryId}
                          onChange={(e) => setNewStoreCountryId(e.target.value)}
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none cursor-pointer"
                        >
                          {countries.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                          ))}
                        </select>
                      </div>

                      <div className="border-t border-gray-100 dark:border-[#055740] pt-3 space-y-3">
                        <h4 className="text-xs font-black uppercase text-dfyf-green">Shopify Integration</h4>
                        
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Shopify Store URL</label>
                          <input 
                            type="text" 
                            value={newStoreShopifyUrl}
                            onChange={(e) => setNewStoreShopifyUrl(e.target.value)}
                            placeholder="tienda.myshopify.com" 
                            className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Client ID (API Key)</label>
                          <input 
                            type="text" 
                            value={newStoreShopifyClientId}
                            onChange={(e) => setNewStoreShopifyClientId(e.target.value)}
                            placeholder="client_id" 
                            className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Client Secret</label>
                          <input 
                            type="password" 
                            value={newStoreShopifyClientSecret}
                            onChange={(e) => setNewStoreShopifyClientSecret(e.target.value)}
                            placeholder="client_secret" 
                            className="w-full px-3.5 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none"
                          />
                        </div>
                      </div>

                      {storeActionError && (
                        <div className="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl text-center">
                          {storeActionError}
                        </div>
                      )}

                      {storeActionSuccess && (
                        <div className="p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 text-xs font-bold rounded-xl text-center">
                          {storeActionSuccess}
                        </div>
                      )}

                      <button 
                        type="submit"
                        className="w-full bg-dfyf-green hover:bg-[#046c4e] text-white font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Crear Tienda
                      </button>
                    </form>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="font-bold text-lg">Tiendas en el Sistema</h3>
                      <div className="border border-gray-100 dark:border-[#055740] rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-[#044c38] border-b border-gray-100 dark:border-[#055740] text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                              <th className="p-3">Tienda</th>
                              <th className="p-3">Dirección</th>
                              <th className="p-3">Shopify URL</th>
                              <th className="p-3">País</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stores.map((s) => (
                              <tr key={s.id} className="border-b border-gray-100 dark:border-[#055740] last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                                <td className="p-3 font-bold text-gray-900 dark:text-white">{s.name}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-300">{s.address || "-"}</td>
                                <td className="p-3 text-xs font-bold text-dfyf-green">{s.shopifyUrl || "No integrada"}</td>
                                <td className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                                  {countries.find((c) => c.id === s.countryId)?.name || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        </div>
      </main>

      {/* MODAL 1: SELECT MULTIPLE CUSTOMER RESULTS */}
      {isCustomerListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 dark:border-[#055740] flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Coincidencias en el CRM</h3>
              <button 
                onClick={() => setIsCustomerListOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5 max-h-[300px] overflow-y-auto space-y-2">
              <p className="text-xs text-gray-500 mb-3">La búsqueda arrojó múltiples coincidencias. Selecciona la clienta correcta para continuar:</p>
              {searchCustomerResults.map((cust) => (
                <div 
                  key={cust.id} 
                  className="p-3 bg-[#F9FAFB] dark:bg-[#044c38] border border-gray-100 dark:border-[#055740] rounded-xl flex items-center justify-between hover:border-dfyf-green/50 transition-all group"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-sm text-gray-950 dark:text-white truncate">{cust.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {cust.rut ? `RUT: ${cust.rut}` : "Sin RUT"} • {cust.email || "Sin email"}
                    </p>
                    {cust.phone && <p className="text-[10px] text-gray-400 mt-0.5">📞 {cust.phone}</p>}
                  </div>
                  <button
                    onClick={() => {
                      setIdentifiedCustomer(cust);
                      setIsCustomerListOpen(false);
                      setSearchCustomerQuery("");
                      setCustomerSearchError("");
                    }}
                    className="px-3 py-1.5 bg-dfyf-green hover:bg-[#046c4e] text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    Seleccionar
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#022c20] border-t border-gray-100 dark:border-[#055740] flex justify-between gap-3">
              <button
                onClick={() => {
                  setIsCustomerListOpen(false);
                  setNewCustError("");
                  setIsNewCustomerOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                ➕ Crear Cliente Nuevo
              </button>
              <button
                onClick={() => setIsCustomerListOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs hover:bg-gray-100 dark:hover:bg-[#033b2b] cursor-pointer transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE NEW CUSTOMER */}
      {isNewCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 dark:border-[#055740] flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Registrar Cliente Nuevo</h3>
              <button 
                onClick={() => setIsNewCustomerOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">Nombre *</label>
                  <input 
                    type="text"
                    placeholder="Ej: Paula"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green text-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">Apellido *</label>
                  <input 
                    type="text"
                    placeholder="Ej: Silva"
                    value={newCustLastName}
                    onChange={(e) => setNewCustLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green text-gray-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">RUT (Sin puntos, con guion)</label>
                <input 
                  type="text"
                  placeholder="Ej: 19876543-2"
                  value={newCustRut}
                  onChange={(e) => setNewCustRut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">Correo Electrónico (Opcional)</label>
                <input 
                  type="email"
                  placeholder="Ej: paula@correo.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">Teléfono (Opcional)</label>
                <input 
                  type="text"
                  placeholder="Ej: +56912345678"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#055740] rounded-xl bg-white dark:bg-[#044c38] text-sm focus:outline-none focus:ring-1 focus:ring-dfyf-green text-gray-950 dark:text-white"
                />
              </div>

              {newCustError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl text-center">
                  ⚠️ {newCustError}
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#022c20] border-t border-gray-100 dark:border-[#055740] flex justify-end gap-3">
              <button
                onClick={() => setIsNewCustomerOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-[#055740] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs hover:bg-gray-100 dark:hover:bg-[#033b2b] cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomer}
                disabled={isCreatingCustomer}
                className="px-5 py-2 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCreatingCustomer ? "Guardando..." : "Guardar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW & EDIT SALE DETAILS */}
      {selectedSaleDetail && (() => {
        const canEditSale = currentUser && (
          currentUser.role !== "CLERK" ||
          selectedSaleDetail.userId === currentUser.id ||
          (selectedSaleDetail.vendedor && currentUser.name && selectedSaleDetail.vendedor.toLowerCase() === currentUser.name.toLowerCase())
        );
        const isAdminUser = currentUser && currentUser.role !== "CLERK";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-6 border-b border-gray-100 dark:border-[#055740] flex justify-between items-center bg-gray-50/50 dark:bg-[#022c20]/50">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {isEditingSale ? "✏️ Editar Transacción" : "Detalle de Transacción"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {selectedSaleDetail.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingSale && canEditSale && (
                    <button
                      onClick={() => startEditingSale(selectedSaleDetail)}
                      className="px-3.5 py-1.5 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                    >
                      ✏️ Editar Venta
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedSaleDetail(null);
                      setIsEditingSale(false);
                    }} 
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer text-xl font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {isEditingSale ? (
                /* EDIT MODE FORM */
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Fecha y Hora */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Fecha y Hora</label>
                      <input 
                        type="datetime-local"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-dfyf-green"
                      />
                    </div>

                    {/* Vendedor */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Vendedor</label>
                      <input 
                        type="text"
                        value={editVendedor}
                        onChange={(e) => setEditVendedor(e.target.value)}
                        placeholder="Nombre del Vendedor (ej: Beatriz, Marite)"
                        className="w-full p-2.5 bg-gray-50 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-dfyf-green"
                      />
                    </div>

                    {/* Canal de Venta */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Canal de Venta</label>
                      <select
                        value={editChannel}
                        onChange={(e) => setEditChannel(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-dfyf-green"
                      >
                        <option value="OFFLINE">Tienda Física (OFFLINE)</option>
                        <option value="ONLINE">Venta Web (ONLINE)</option>
                        <option value="EVENTO">Evento / Pop-up (EVENTO)</option>
                      </select>
                    </div>

                    {/* Método de Pago */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Método de Pago</label>
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => setEditPaymentMethod(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-dfyf-green"
                      >
                        <option value="Débito">Débito</option>
                        <option value="Crédito">Crédito</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="MercadoPago">MercadoPago</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    {/* Banco / Detalle de Pago */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Banco / Detalle de Pago</label>
                      <input 
                        type="text"
                        value={editPaymentBank}
                        onChange={(e) => setEditPaymentBank(e.target.value)}
                        placeholder="Ej: Banco Estado, Transbank, etc."
                        className="w-full p-2.5 bg-gray-50 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-dfyf-green"
                      />
                    </div>

                    {/* Cliente de la Transacción */}
                    <div className="p-4 bg-gray-50 dark:bg-[#022c20]/40 border border-gray-200 dark:border-[#055740] rounded-xl space-y-2 sm:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-400 uppercase">Cliente de la Transacción</label>
                        <div className="flex items-center gap-2">
                          {editCustomer && (
                            <button
                              type="button"
                              onClick={() => setEditCustomer(null)}
                              className="text-xs text-red-500 hover:underline font-bold"
                            >
                              ❌ Quitar Cliente
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (customersList.length === 0) fetchCustomersList();
                              setCustomerSearchQuery("");
                              setIsCustomerPickerOpen(true);
                            }}
                            className="px-3 py-1 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            👤 {editCustomer ? "Cambiar Cliente" : "Asignar Cliente"}
                          </button>
                        </div>
                      </div>

                      {editCustomer ? (
                        <div className="text-xs space-y-0.5">
                          <p className="font-black text-gray-900 dark:text-white">{editCustomer.name}</p>
                          <p className="text-gray-500">RUT: {editCustomer.rut || "Sin RUT"} | Email: {editCustomer.email || "Sin email"} | Tel: {editCustomer.phone || "Sin teléfono"}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Venta rápida sin cliente asignado.</p>
                      )}
                    </div>
                  </div>

                  {/* Edit Items Section */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Editar Artículos de la Transacción</h4>
                    <div className="space-y-3">
                      {editItems.map((item: any, idx: number) => {
                        const isPercent = item.discount > 0 && item.discount <= 100;
                        const discountVal = isPercent 
                          ? Math.round(item.price * (item.discount / 100))
                          : (item.discount || 0);
                        const lineTotal = (item.price - discountVal) * item.quantity;

                        return (
                          <div key={idx} className="p-3 bg-gray-50 dark:bg-[#022c20]/40 border border-gray-200 dark:border-[#055740] rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-gray-900 dark:text-white">
                                {item.productName} (Talla: {item.productSize})
                              </span>
                              <span className="text-xs font-black text-dfyf-green">
                                Subtotal: ${lineTotal.toLocaleString("es-CL")}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">Precio Unit. ($)</label>
                                <input 
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...editItems];
                                    updated[idx].price = val;
                                    setEditItems(updated);
                                  }}
                                  className="w-full p-2 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">Descuento ($ o %)</label>
                                <input 
                                  type="number"
                                  value={item.discount}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...editItems];
                                    updated[idx].discount = val;
                                    setEditItems(updated);
                                  }}
                                  className="w-full p-2 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">Cantidad</label>
                                <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    const updated = [...editItems];
                                    updated[idx].quantity = val;
                                    setEditItems(updated);
                                  }}
                                  className="w-full p-2 bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edit Notes */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Notas / Comentarios</label>
                    <textarea 
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      placeholder="Notas o motivos de la venta..."
                      className="w-full p-2.5 bg-gray-50 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:border-dfyf-green"
                    />
                  </div>

                  {/* Total recalculado */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-[#055740]">
                    <span className="text-xs font-bold text-gray-500">Total Recalculado:</span>
                    <span className="text-lg font-black text-dfyf-green">
                      ${editItems.reduce((acc, i) => {
                        const isPercent = i.discount > 0 && i.discount <= 100;
                        const discountVal = isPercent ? Math.round(i.price * (i.discount / 100)) : (i.discount || 0);
                        return acc + (i.price - discountVal) * i.quantity;
                      }, 0).toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              ) : (
                /* READ MODE VIEW */
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Resumen de Venta */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-[#022c20]/40 p-4 rounded-xl border border-gray-100 dark:border-[#055740]/40">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Fecha</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {new Date(selectedSaleDetail.date).toLocaleDateString("es-CL", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Vendedor</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedSaleDetail.vendedor || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Canal</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedSaleDetail.channel || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Método de Pago</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {selectedSaleDetail.paymentMethod || "No registrado"}
                        {selectedSaleDetail.paymentBank ? ` (${selectedSaleDetail.paymentBank})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Información del Cliente */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Detalles del Cliente</h4>
                    {selectedSaleDetail.customer ? (
                      <div className="bg-white dark:bg-[#033b2b] border border-gray-100 dark:border-[#055740] rounded-xl p-4 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Nombre:</span>{" "}
                            <span className="font-bold text-gray-950 dark:text-white">{selectedSaleDetail.customer.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">RUT:</span>{" "}
                            <span className="font-bold text-gray-950 dark:text-white">{selectedSaleDetail.customer.rut || "Sin RUT"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Email:</span>{" "}
                            <span className="font-bold text-gray-950 dark:text-white">{selectedSaleDetail.customer.email || "Sin email"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Teléfono:</span>{" "}
                            <span className="font-bold text-gray-950 dark:text-white">{selectedSaleDetail.customer.phone || "Sin teléfono"}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic p-3 bg-gray-50 dark:bg-[#022c20]/20 rounded-xl border border-gray-100 dark:border-[#055740]/20 text-center">
                        Venta directa en mesón sin registro de cliente (Venta rápida).
                      </div>
                    )}
                  </div>

                  {/* Artículos de la Venta */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Artículos de la Transacción</h4>
                    <div className="space-y-3">
                      {selectedSaleDetail.items.map((item: any) => {
                        const isPercent = item.discount > 0 && item.discount <= 100;
                        const discountVal = isPercent 
                          ? Math.round(item.price * (item.discount / 100))
                          : (item.discount || 0);
                        const pct = item.price > 0 ? Math.round((discountVal / item.price) * 100) : 0;
                        const finalUnitPrice = item.price - discountVal;
                        const finalTotalLine = finalUnitPrice * item.quantity;
                        
                        return (
                          <div 
                            key={item.id}
                            className="flex items-center gap-4 p-3 bg-[#F9FAFB] dark:bg-[#044c38]/40 border border-gray-100 dark:border-[#055740]/40 rounded-xl"
                          >
                            <div className="w-14 h-14 bg-gray-100 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                              {item.product?.imageUrl ? (
                                <img 
                                  src={item.product.imageUrl} 
                                  alt={item.product.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-gray-400 uppercase font-black">ZAPATO</span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {item.product?.name || "Producto desconocido"}
                                {item.product?.color ? ` - ${item.product.color}` : ""}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                <span>Talla: <span className="font-bold text-gray-800 dark:text-gray-200">{item.product?.size || "N/A"}</span></span>
                                <span>Cantidad: <span className="font-bold text-gray-800 dark:text-gray-200">{item.quantity}</span></span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-black text-gray-900 dark:text-white">
                                ${finalTotalLine.toLocaleString("es-CL")}
                              </p>
                              {discountVal > 0 && (
                                <p className="text-[10px] text-red-500 font-bold">
                                  Desc: -${(discountVal * item.quantity).toLocaleString("es-CL")} ({pct}%)
                                </p>
                              )}
                              <p className="text-[9px] text-gray-400">
                                Unit: ${item.price.toLocaleString("es-CL")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notas de la venta */}
                  {selectedSaleDetail.notes && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notas / Comentarios</h4>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs rounded-xl italic">
                        "{selectedSaleDetail.notes}"
                      </div>
                    </div>
                  )}

                  {/* Total final */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-[#055740]/40">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Monto Total de la Transacción:</span>
                    <span className="text-xl font-black text-dfyf-green">
                      ${selectedSaleDetail.total.toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              )}

              {/* MODAL FOOTER */}
              <div className="p-4 bg-gray-50 dark:bg-[#022c20] border-t border-gray-100 dark:border-[#055740] flex justify-between items-center gap-3">
                {isEditingSale ? (
                  <>
                    <div>
                      {isAdminUser && (
                        <button
                          onClick={handleDeleteSale}
                          disabled={isDeletingSale || isSavingSaleEdit}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isDeletingSale ? "Eliminando..." : "🗑️ Eliminar Transacción"}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsEditingSale(false)}
                        className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-xl text-xs cursor-pointer transition-all hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveSaleEdit}
                        disabled={isSavingSaleEdit || isDeletingSale}
                        className="px-6 py-2 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSavingSaleEdit ? "Guardando..." : "💾 Guardar Cambios"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      {isAdminUser && (
                        <button
                          onClick={handleDeleteSale}
                          disabled={isDeletingSale}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isDeletingSale ? "Eliminando..." : "🗑️ Eliminar Transacción"}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedSaleDetail(null)}
                        className="px-6 py-2 bg-dfyf-green hover:bg-[#046c4e] text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-md"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* POPUP MODAL: SELECCIONAR CLIENTE PARA EDICION DE VENTA */}
      {isCustomerPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#033b2b] border border-gray-200 dark:border-[#055740] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-[#055740] pb-3">
              <h3 className="text-base font-black text-gray-900 dark:text-white">👤 Seleccionar Cliente para la Venta</h3>
              <button 
                onClick={() => setIsCustomerPickerOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="Buscar por Nombre, RUT, Email o Teléfono..."
                className="w-full p-2.5 bg-gray-50 dark:bg-[#022c20] border border-gray-200 dark:border-[#055740] rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-dfyf-green"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              <div 
                onClick={() => {
                  setEditCustomer(null);
                  setIsCustomerPickerOpen(false);
                }}
                className="p-3 bg-gray-50 hover:bg-gray-100 dark:bg-[#022c20]/50 dark:hover:bg-[#022c20] rounded-xl border border-gray-200 dark:border-[#055740] cursor-pointer flex justify-between items-center transition-all"
              >
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">🚫 Sin Cliente (Venta Rápida)</span>
                <span className="text-xs text-dfyf-green font-bold">Seleccionar</span>
              </div>

              {customersList
                .filter((c: any) => {
                  if (!customerSearchQuery.trim()) return true;
                  const q = customerSearchQuery.toLowerCase();
                  return (
                    (c.name && c.name.toLowerCase().includes(q)) ||
                    (c.rut && c.rut.toLowerCase().includes(q)) ||
                    (c.email && c.email.toLowerCase().includes(q)) ||
                    (c.phone && c.phone.toLowerCase().includes(q))
                  );
                })
                .map((c: any) => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      setEditCustomer(c);
                      setIsCustomerPickerOpen(false);
                    }}
                    className="p-3 bg-gray-50 hover:bg-emerald-50/50 dark:bg-[#022c20]/30 dark:hover:bg-[#022c20] rounded-xl border border-gray-200 dark:border-[#055740] cursor-pointer flex justify-between items-center transition-all"
                  >
                    <div className="text-xs">
                      <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-gray-400">RUT: {c.rut || "Sin RUT"} | Email: {c.email || "Sin email"}</p>
                    </div>
                    <button className="px-3 py-1 bg-dfyf-green text-white text-[10px] font-bold rounded-lg shadow-sm">
                      Seleccionar
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#055740]">
              <button
                onClick={() => setIsCustomerPickerOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
