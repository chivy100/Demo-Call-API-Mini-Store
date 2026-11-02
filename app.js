// 1. Cấu hình Axios và các biến dùng chung
const api = axios.create({
    baseURL: "https://dummyjson.com",
    timeout: 8000
});

const PAGE_SIZE = 12;

const state = {
    page: 1,
    total: 0,
    category: "",
    keyword: "",
    sortBy: "",
    order: "",
    lastRequest: null,
    searchController: null,
    modalController: null
};

const elements = {
    searchInput: document.getElementById("search-input"),
    clearSearch: document.getElementById("clear-search"),
    categorySelect: document.getElementById("category-select"),
    sortSelect: document.getElementById("sort-select"),
    statusRegion: document.getElementById("status-region"),
    loadingState: document.getElementById("loading-state"),
    errorState: document.getElementById("error-state"),
    errorMessage: document.getElementById("error-message"),
    emptyState: document.getElementById("empty-state"),
    emptyMessage: document.getElementById("empty-message"),
    productGrid: document.getElementById("product-grid"),
    resultSummary: document.getElementById("result-summary"),
    pagination: document.getElementById("pagination"),
    prevButton: document.getElementById("prev-button"),
    nextButton: document.getElementById("next-button"),
    pageInfo: document.getElementById("page-info"),
    reloadButton: document.getElementById("reload-button"),
    retryButton: document.getElementById("retry-button"),
    modal: document.getElementById("product-modal"),
    modalContent: document.getElementById("modal-content"),
    modalClose: document.getElementById("modal-close")
};

// 2. Interceptor: gom việc chuyển lỗi thành thông báo tiếng Việt tại một nơi
api.interceptors.response.use(
    response => response,
    error => {
        if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
            return Promise.reject(error);
        }

        let message = "Đã có lỗi xảy ra. Vui lòng thử lại.";

        if (error.code === "ECONNABORTED") {
            message = "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
        } else if (error.response) {
            const status = error.response.status;

            if (status === 404) {
                message = error.response.data?.message || "Không tìm thấy dữ liệu yêu cầu.";
            } else if (status >= 500) {
                message = "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
            } else if (status === 400) {
                message = "Yêu cầu không hợp lệ.";
            } else {
                message = `Yêu cầu thất bại (mã lỗi ${status}).`;
            }
        } else if (error.request) {
            message = "Không kết nối được máy chủ. Hãy kiểm tra Internet và thử lại.";
        }

        error.userMessage = message;
        return Promise.reject(error);
    }
);

// 3. Hàm hiển thị trạng thái
function showLoading() {
    elements.loadingState.hidden = false;
    elements.errorState.hidden = true;
    elements.emptyState.hidden = true;
    elements.productGrid.innerHTML = "";
    elements.prevButton.disabled = true;
    elements.nextButton.disabled = true;
    elements.reloadButton.disabled = true;
    elements.resultSummary.textContent = "Đang tải dữ liệu...";
}

function hideLoading() {
    elements.loadingState.hidden = true;
    elements.reloadButton.disabled = false;
    updatePaginationButtons();
}

function showError(message) {
    elements.errorState.hidden = false;
    elements.errorMessage.textContent = message;
    elements.emptyState.hidden = true;
    elements.resultSummary.textContent = "Không thể tải sản phẩm.";
}

function showEmpty(message) {
    elements.emptyState.hidden = false;
    elements.emptyMessage.textContent = message;
    elements.errorState.hidden = true;
    elements.resultSummary.textContent = "Không có kết quả phù hợp.";
}

function getErrorMessage(error) {
    return error.userMessage || "Không thể tải dữ liệu. Vui lòng thử lại.";
}

// 4. Hàm tiện ích định dạng và tạo phần tử an toàn
function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "USD"
    }).format(Number(value) || 0);
}

function safeText(value, fallback = "Không rõ") {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }
    return String(value);
}

function createImage(src, alt, className = "product-image") {
    const image = document.createElement("img");
    image.className = className;
    image.alt = alt;
    image.loading = "lazy";
    image.src = src || "";
    image.onerror = () => {
        image.onerror = null;
        image.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="#f0f2f7"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8993a5" font-family="Arial" font-size="18">Không có ảnh</text></svg>`
        );
    };
    return image;
}

// 5. Render danh sách sản phẩm ra DOM bằng createElement/textContent
function renderProducts(products) {
    elements.productGrid.innerHTML = "";

    products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";
        if (product.stock === 0) card.classList.add("out-of-stock");

        const imageWrap = document.createElement("div");
        imageWrap.className = "product-image-wrap";
        imageWrap.appendChild(createImage(product.thumbnail, safeText(product.title, "Ảnh sản phẩm")));

        if (product.stock === 0) {
            const badge = document.createElement("span");
            badge.className = "stock-badge";
            badge.textContent = "Hết hàng";
            imageWrap.appendChild(badge);
        }

        const info = document.createElement("div");
        info.className = "product-info";

        const category = document.createElement("div");
        category.className = "product-category";
        category.textContent = safeText(product.category, "Sản phẩm");

        const title = document.createElement("h3");
        title.className = "product-title";
        title.textContent = safeText(product.title, "Chưa có tên sản phẩm");

        const brand = document.createElement("p");
        brand.className = "product-brand";
        brand.textContent = `Thương hiệu: ${safeText(product.brand)}`;

        const priceRow = document.createElement("div");
        priceRow.className = "price-row";

        const hasDiscount = Number(product.discountPercentage) > 0;
        const discountedPrice = hasDiscount
            ? Number(product.price) * (1 - Number(product.discountPercentage) / 100)
            : Number(product.price);

        const currentPrice = document.createElement("span");
        currentPrice.className = "current-price";
        currentPrice.textContent = formatCurrency(discountedPrice.toFixed(2));
        priceRow.appendChild(currentPrice);

        if (hasDiscount) {
            const oldPrice = document.createElement("span");
            oldPrice.className = "old-price";
            oldPrice.textContent = formatCurrency(product.price);
            priceRow.appendChild(oldPrice);
        }

        const meta = document.createElement("div");
        meta.className = "product-meta";

        const rating = document.createElement("span");
        rating.className = "rating";
        rating.textContent = `★ ${Number(product.rating || 0).toFixed(1)}`;

        const stock = document.createElement("span");
        stock.textContent = product.stock === 0 ? "Hết hàng" : `Còn ${safeText(product.stock, "0")}`;

        meta.append(rating, stock);

        const detailButton = document.createElement("button");
        detailButton.className = "card-action";
        detailButton.type = "button";
        detailButton.textContent = "Xem chi tiết";
        detailButton.addEventListener("click", () => openProductDetail(product.id));

        info.append(category, title, brand, priceRow, meta, detailButton);
        card.append(imageWrap, info);
        elements.productGrid.appendChild(card);
    });
}

// 6. Tạo params và gọi API danh sách sản phẩm
function buildProductParams() {
    const params = {
        limit: PAGE_SIZE,
        skip: (state.page - 1) * PAGE_SIZE
    };

    if (state.sortBy) {
        params.sortBy = state.sortBy;
        params.order = state.order;
    }

    return params;
}

async function loadProducts(page = 1, options = {}) {
    state.page = page;

    // Hủy request tìm kiếm cũ nếu có request mới
    if (state.searchController && !options.signal) {
        state.searchController.abort();
        state.searchController = null;
    }

    showLoading();

    try {
        let response;

        if (options.signal) {
            response = await api.get("/products/search", {
                params: {
                    q: state.keyword,
                    ...buildProductParams()
                },
                signal: options.signal
            });
        } else if (state.keyword) {
            response = await api.get("/products/search", {
                params: {
                    q: state.keyword,
                    ...buildProductParams()
                }
            });
        } else if (state.category) {
            response = await api.get(
                `/products/category/${encodeURIComponent(state.category)}`,
                { params: buildProductParams() }
            );
        } else {
            response = await api.get("/products", {
                params: buildProductParams()
            });
        }

        // API danh sách trả mảng sản phẩm trong response.data.products
        const { products, total } = response.data;
        state.total = total;

        if (!Array.isArray(products) || products.length === 0) {
            renderProducts([]);
            const message = state.keyword
                ? `Không tìm thấy sản phẩm nào cho từ khóa "${state.keyword}".`
                : "Không có sản phẩm nào trong danh sách này.";
            showEmpty(message);
            renderPagination();
            return;
        }

        renderProducts(products);
        elements.errorState.hidden = true;
        elements.emptyState.hidden = true;
        elements.resultSummary.textContent = `Hiển thị ${products.length} / ${total} sản phẩm`;
        renderPagination();
    } catch (error) {
        if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
            return;
        }

        renderProducts([]);
        showError(getErrorMessage(error));
    } finally {
        // Chỉ request hiện tại mới được phép tắt loading
        if (!options.signal || state.searchController?.signal === options.signal) {
            hideLoading();
        } else if (options.signal && !options.signal.aborted) {
            hideLoading();
        }
    }
}

// 7. Phân trang
function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    elements.pageInfo.textContent = `Trang ${state.page} / ${totalPages}`;
    elements.pagination.hidden = totalPages <= 1;
    updatePaginationButtons();
}

function updatePaginationButtons() {
    const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    const isLoading = !elements.loadingState.hidden;
    elements.prevButton.disabled = isLoading || state.page <= 1;
    elements.nextButton.disabled = isLoading || state.page >= totalPages;
}

elements.prevButton.addEventListener("click", () => {
    if (state.page > 1) loadProducts(state.page - 1);
});

elements.nextButton.addEventListener("click", () => {
    const totalPages = Math.ceil(state.total / PAGE_SIZE);
    if (state.page < totalPages) loadProducts(state.page + 1);
});

// 8. Tải danh mục
async function loadCategories() {
    try {
        const response = await api.get("/products/categories");
        const categories = response.data;

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category.slug;
            option.textContent = category.name;
            elements.categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Không tải được danh mục:", getErrorMessage(error));
    }
}

// 9. Debounce tìm kiếm và hủy request cũ bằng AbortController
function debounce(callback, delay) {
    let timer;

    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

const handleSearch = debounce(async keyword => {
    state.keyword = keyword.trim();
    state.category = "";
    state.page = 1;
    elements.categorySelect.value = "";

    if (state.searchController) {
        state.searchController.abort();
    }

    const controller = new AbortController();
    state.searchController = controller;

    await loadProducts(1, { signal: controller.signal });
}, 400);

elements.searchInput.addEventListener("input", event => {
    const keyword = event.target.value;
    elements.clearSearch.hidden = keyword.length === 0;

    // Mỗi lần gõ mới, hủy request đang chạy trước đó
    if (state.searchController) {
        state.searchController.abort();
    }

    handleSearch(keyword);
});

elements.clearSearch.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.clearSearch.hidden = true;
    state.keyword = "";
    state.page = 1;
    if (state.searchController) state.searchController.abort();
    loadProducts(1);
});

// 10. Lọc danh mục và sắp xếp trên server
elements.categorySelect.addEventListener("change", () => {
    state.category = elements.categorySelect.value;
    state.keyword = "";
    state.page = 1;
    elements.searchInput.value = "";
    elements.clearSearch.hidden = true;
    loadProducts(1);
});

elements.sortSelect.addEventListener("change", () => {
    const [sortBy, order] = elements.sortSelect.value.split("-");
    state.sortBy = sortBy || "";
    state.order = order || "";
    state.page = 1;
    loadProducts(1);
});

// 11. Modal chi tiết sản phẩm
async function openProductDetail(id) {
    if (state.modalController) state.modalController.abort();

    const controller = new AbortController();
    state.modalController = controller;

    elements.modal.hidden = false;
    document.body.style.overflow = "hidden";
    elements.modalContent.innerHTML = '<div class="modal-loading"><span class="spinner"></span> Đang tải chi tiết...</div>';

    try {
        const response = await api.get(`/products/${id}`, {
            signal: controller.signal
        });

        if (controller.signal.aborted) return;

        const product = response.data;
        renderProductDetail(product);
    } catch (error) {
        if (axios.isCancel(error) || error.code === "ERR_CANCELED") return;
        elements.modalContent.textContent = getErrorMessage(error);
    }
}

function renderProductDetail(product) {
    elements.modalContent.innerHTML = "";

    const layout = document.createElement("div");
    layout.className = "detail-layout";

    const gallery = document.createElement("div");
    const mainImage = document.createElement("div");
    mainImage.className = "detail-main-image";
    const mainPhoto = createImage(product.thumbnail, safeText(product.title), "detail-main-photo");
    mainImage.appendChild(mainPhoto);

    const thumbnails = document.createElement("div");
    thumbnails.className = "detail-thumbnails";
    const images = Array.isArray(product.images) ? product.images : [];
    images.forEach(src => {
        const thumb = createImage(src, safeText(product.title), "detail-thumb");
        thumb.addEventListener("click", () => {
            mainPhoto.src = src;
        });
        thumbnails.appendChild(thumb);
    });
    gallery.append(mainImage, thumbnails);

    const copy = document.createElement("div");
    const category = document.createElement("div");
    category.className = "product-category";
    category.textContent = safeText(product.category, "Sản phẩm");

    const title = document.createElement("h2");
    title.id = "modal-title";
    title.textContent = safeText(product.title, "Chi tiết sản phẩm");

    const description = document.createElement("p");
    description.className = "detail-description";
    description.textContent = safeText(product.description, "Chưa có mô tả.");

    const hasDiscount = Number(product.discountPercentage) > 0;
    const discountedPrice = hasDiscount
        ? Number(product.price) * (1 - Number(product.discountPercentage) / 100)
        : Number(product.price);

    const price = document.createElement("div");
    price.className = "detail-price";
    if (hasDiscount) {
        const curPrice = document.createElement("span");
        curPrice.textContent = formatCurrency(discountedPrice.toFixed(2));

        const oldPrice = document.createElement("span");
        oldPrice.className = "old-price";
        oldPrice.style.fontSize = "15px";
        oldPrice.style.marginLeft = "9px";
        oldPrice.textContent = formatCurrency(product.price);

        const discountBadge = document.createElement("span");
        discountBadge.style.fontSize = "13px";
        discountBadge.style.color = "#16a34a";
        discountBadge.style.fontWeight = "700";
        discountBadge.style.marginLeft = "8px";
        discountBadge.textContent = `(-${product.discountPercentage}%)`;

        price.append(curPrice, oldPrice, discountBadge);
    } else {
        price.textContent = formatCurrency(product.price);
    }

    const brand = document.createElement("p");
    brand.className = "product-brand";
    brand.textContent = `Thương hiệu: ${safeText(product.brand)}`;

    const stock = document.createElement("p");
    stock.className = "product-brand";
    stock.textContent = `Tồn kho: ${product.stock === 0 ? "Hết hàng" : safeText(product.stock, "0")}`;

    copy.append(category, title, description, price, brand, stock);
    layout.append(gallery, copy);
    elements.modalContent.appendChild(layout);

    const reviewSection = document.createElement("section");
    reviewSection.className = "review-section";
    const reviewHeading = document.createElement("h3");
    reviewHeading.textContent = "Đánh giá khách hàng";
    reviewSection.appendChild(reviewHeading);

    const reviews = Array.isArray(product.reviews) ? product.reviews : [];
    if (reviews.length === 0) {
        const noReview = document.createElement("p");
        noReview.className = "muted";
        noReview.textContent = "Chưa có đánh giá.";
        reviewSection.appendChild(noReview);
    } else {
        reviews.forEach(review => {
            const item = document.createElement("article");
            item.className = "review";

            const reviewer = document.createElement("strong");
            reviewer.textContent = safeText(review.reviewerName, "Khách hàng");

            const rating = document.createElement("span");
            rating.className = "rating";
            rating.textContent = `  ★ ${Number(review.rating || 0).toFixed(1)}`;

            const comment = document.createElement("p");
            comment.textContent = safeText(review.comment, "Không có nội dung đánh giá.");

            const date = document.createElement("small");
            date.textContent = review.date ? new Date(review.date).toLocaleDateString("vi-VN") : "";

            item.append(reviewer, rating, comment, date);
            reviewSection.appendChild(item);
        });
    }

    elements.modalContent.appendChild(reviewSection);
}

function closeProductDetail() {
    if (state.modalController) {
        state.modalController.abort();
        state.modalController = null;
    }
    elements.modal.hidden = true;
    document.body.style.overflow = "";
}

elements.modalClose.addEventListener("click", closeProductDetail);
elements.modal.addEventListener("click", event => {
    if (event.target.hasAttribute("data-close-modal")) closeProductDetail();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !elements.modal.hidden) closeProductDetail();
});

// 12. Nút tải lại và thử lại
elements.reloadButton.addEventListener("click", () => loadProducts(state.page));
elements.retryButton.addEventListener("click", () => loadProducts(state.page));

// 13. Khởi chạy: tải danh mục và sản phẩm song song
async function init() {
    showLoading();

    try {
        const [categoriesResponse, productsResponse] = await Promise.all([
            api.get("/products/categories"),
            api.get("/products", {
                params: { limit: PAGE_SIZE, skip: 0 }
            })
        ]);

        // Đổ danh mục vào dropdown
        categoriesResponse.data.forEach(category => {
            const option = document.createElement("option");
            option.value = category.slug;
            option.textContent = category.name;
            elements.categorySelect.appendChild(option);
        });

        // Render sản phẩm từ request khởi tạo
        const { products, total } = productsResponse.data;
        state.total = total;

        if (!Array.isArray(products) || products.length === 0) {
            showEmpty("Không có sản phẩm nào.");
            renderProducts([]);
        } else {
            renderProducts(products);
            elements.resultSummary.textContent = `Hiển thị ${products.length} / ${total} sản phẩm`;
            elements.errorState.hidden = true;
            elements.emptyState.hidden = true;
        }

        renderPagination();
    } catch (error) {
        showError(getErrorMessage(error));
    } finally {
        hideLoading();
    }
}

init();
