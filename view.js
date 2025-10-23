import { supabase } from './config.js';
import { displayMarkersOnMap } from './mapUtils.js';
import { renderHeritageList } from './ui.js';

let viewMapInstance;
let markers = [];
let isInitialized = false;

function renderLegend() {
    const legendContainer = document.getElementById('legend-container');
    legendContainer.innerHTML = `
        <div class="legend-title">Chú giải</div>
        <div class="legend-item">
            <div class="legend-color-box" style="background: #ef4444;"></div> Di tích lịch sử
        </div>
        <div class="legend-item">
            <div class="legend-color-box" style="background: #22c55e;"></div> Di tích tôn giáo
        </div>
        <div class="legend-item">
            <div class="legend-color-box" style="background: #3b82f6;"></div> Di tích kiến trúc
        </div>
        <div class="legend-item">
            <div class="legend-color-box" style="background: #9ca3af;"></div> Loại khác
        </div>
    `;
}

function handleHeritageAdded() {
    if (document.getElementById('view-heritage-container').classList.contains('active')) {
        loadHeritages();
    }
}

export function initViewHeritages(map) {
    viewMapInstance = map;
    markers.forEach(marker => {
        if (viewMapInstance.hasLayer(marker)) {
            viewMapInstance.removeLayer(marker);
        }
    });
    markers = [];
    
    renderLegend(); // Render chú giải
    loadHeritages();

    if (!isInitialized) {
        document.addEventListener('heritageAdded', handleHeritageAdded);
        isInitialized = true;
    }
}

async function loadHeritages() {
    const listContainer = document.getElementById('view-list-container');
    const loadingOverlay = document.getElementById('view-loading-overlay');
    listContainer.innerHTML = '<div class="sidebar-placeholder">Đang tải danh sách...</div>';
    loadingOverlay.classList.remove('hidden');
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

        displayMarkersOnMap(viewMapInstance, data || [], markers);
        renderHeritageList(listContainer, data || [], viewMapInstance, markers);

    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        listContainer.innerHTML = `<div class="sidebar-placeholder status-error">Lỗi: ${error.message}</div>`;
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}
