import { supabase } from './config.js';
import { displayMarkersOnMap, hideLoading } from './mapUtils.js';
import { renderHeritageList } from './ui.js';

let searchMapInstance;
let markers = [];
let allHeritages = [];
let isInitialized = false;

function handleHeritageAdded(event) {
    const newHeritage = event.detail;
    // Thêm di tích mới vào đầu danh sách để nó xuất hiện trên cùng
    allHeritages.unshift(newHeritage);
    // Cập nhật lại danh sách và bản đồ nếu mục tìm kiếm đang mở
    if (document.getElementById('search-heritage-container').classList.contains('active')) {
        handleSearch(); // Gọi lại handleSearch để lọc và hiển thị lại
    }
}

export function initSearchHeritages(map) {
    searchMapInstance = map;
    markers.forEach(marker => {
        if (searchMapInstance.hasLayer(marker)) {
            searchMapInstance.removeLayer(marker);
        }
    });
    markers = [];
    loadHeritages();

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('input', handleSearch); // Cập nhật khi gõ

    if (!isInitialized) {
        document.addEventListener('heritageAdded', handleHeritageAdded);
        isInitialized = true;
    }
}

async function loadHeritages() {
    try {
        const { data, error } = await supabase
            .from('di_tich')
            .select(`
                *,
                xa_phuong:xa_id(ten, tinh_tp:tinh_id(ten)),
                loai_hinh:loai_hinh_id(ten_loai),
                thoi_ky:thoi_ky_id(ten_thoi_ky),
                ton_giao:ton_giao_id(ten_ton_giao),
                hinh_anh(url, mo_ta)
            `)
            .order('id', { ascending: false });
        if (error) throw error;
        allHeritages = data || [];
        handleSearch(); // Hiển thị danh sách ban đầu
        hideLoading();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        document.getElementById('searchResultsList').innerHTML = `<div class="sidebar-placeholder status-error">Lỗi: ${error.message}</div>`;
        hideLoading();
    }
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const listContainer = document.getElementById('searchResultsList');

    const filteredHeritages = allHeritages.filter(heritage =>
        (heritage.ten && heritage.ten.toLowerCase().includes(searchTerm)) ||
        (heritage.dia_chi_cu_the && heritage.dia_chi_cu_the.toLowerCase().includes(searchTerm))
    );

    // Hiển thị các di tích đã lọc trên bản đồ và sidebar
    displayMarkersOnMap(searchMapInstance, filteredHeritages, markers);
    renderHeritageList(listContainer, filteredHeritages, searchMapInstance, markers);
}