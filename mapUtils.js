/**
 * Phân tích chuỗi tọa độ hoặc đối tượng GeoJSON Point thành một mảng [lat, lng].
 * @param {string | object} toaDo - Dữ liệu tọa độ.
 * @returns {Array<number>|null} - Mảng [lat, lng] hoặc null nếu không hợp lệ.
 */
export function parseCoordinates(toaDo) {
    if (!toaDo) return null;

    if (typeof toaDo === 'object' && toaDo.type === 'Point' && toaDo.coordinates) {
        const lng = parseFloat(toaDo.coordinates[0]);
        const lat = parseFloat(toaDo.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
            return [lat, lng];
        }
    }

    if (typeof toaDo === 'string') {
        const match = toaDo.match(/POINT\(([-.0-9]+)\s+([-.0-9]+)\)/);
        if (match) {
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return [lat, lng];
            }
        }
    }

    console.warn('Không thể phân tích tọa độ:', toaDo);
    return null;
}

/**
 * Chọn màu cho marker dựa trên loại hình di tích.
 * @param {object} loaiHinh - Đối tượng loại hình.
 * @returns {string} - Mã màu hex.
 */
function getMarkerColor(loaiHinh) {
    if (!loaiHinh) return '#9ca3af'; // màu xám nếu chưa có loại

    const tenLoai = loaiHinh.ten_loai?.toLowerCase() || '';

    if (tenLoai.includes('lịch sử')) return '#ef4444'; // đỏ
    if (tenLoai.includes('tôn giáo')) return '#22c55e'; // xanh lá
    if (tenLoai.includes('kiến trúc')) return '#3b82f6'; // xanh dương

    return '#9ca3af'; // mặc định xám
}

/**
 * Tạo nội dung HTML cho popup của một di tích trên bản đồ (thiết kế mới).
 * @param {object} heritage - Đối tượng di tích.
 * @returns {string} - Chuỗi HTML.
 */
export function createPopupContent(heritage) {
    const coords = parseCoordinates(heritage.toa_do);
    const coordsText = coords ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : 'N/A';

    const images = heritage.hinh_anh || [];
    const imagesHTML = images.length
        ? `<div class="popup-images">
             ${images.slice(0, 6).map(img => `
                <img src="${img.url}" 
                     class="popup-image" 
                     onclick="window.open('${img.url}', '_blank')" 
                     alt="${img.mo_ta || 'Hình ảnh di tích'}">
             `).join('')}
           </div>
           ${images.length > 6 ? `<div class="image-count">+${images.length - 6} ảnh khác</div>` : ''}
          `
        : `<div class="no-images"><i class="fas fa-image"></i> Chưa có hình ảnh</div>`;

    return `
        <div class="popup-header">
            <div class="popup-title">${heritage.ten || 'Không rõ tên di tích'}</div>
            <div class="popup-coords"><i class="fas fa-location-dot"></i> ${coordsText}</div>
        </div>

        <div class="popup-body">
            <div class="popup-section">
                <div class="popup-label"><i class="fas fa-map-marker-alt"></i> Địa chỉ</div>
                <div class="popup-value">${heritage.dia_chi_cu_the || 'Chưa có thông tin'}</div>
            </div>

            ${heritage.xa_phuong ? `
                <div class="popup-section">
                    <div class="popup-label"><i class="fas fa-map"></i> Khu vực</div>
                    <div class="popup-value">
                        ${heritage.xa_phuong.ten || ''}
                        ${heritage.xa_phuong.tinh_tp?.ten ? ', ' + heritage.xa_phuong.tinh_tp.ten : ''}
                    </div>
                </div>
            ` : ''}

            ${(heritage.loai_hinh || heritage.thoi_ky || heritage.ton_giao) ? `
                <div class="popup-section">
                    <div class="popup-label"><i class="fas fa-tags"></i> Phân loại</div>
                    <div class="popup-value">
                        ${heritage.loai_hinh?.ten_loai ? `<span class="badge badge-type">${heritage.loai_hinh.ten_loai}</span>` : ''}
                        ${heritage.thoi_ky?.ten_thoi_ky ? `<span class="badge badge-period">${heritage.thoi_ky.ten_thoi_ky}</span>` : ''}
                        ${heritage.ton_giao?.ten_ton_giao ? `<span class="badge badge-religion">${heritage.ton_giao.ten_ton_giao}</span>` : ''}
                    </div>
                </div>
            ` : ''}

            <div class="popup-section">
                <div class="popup-label"><i class="fas fa-images"></i> Hình ảnh (${images.length})</div>
                ${imagesHTML}
            </div>

            <div class="popup-section">
                 <button class="directions-btn" data-lat="${coords[0]}" data-lon="${coords[1]}">
                    <i class="fas fa-directions"></i> Tìm đường đến đây
                 </button>
            </div>
        </div>
    `;
}

/**
 * Hiển thị các điểm đánh dấu (marker) trên bản đồ.
 * @param {L.Map} mapInstance - Đối tượng bản đồ Leaflet.
 * @param {Array<object>} heritages - Mảng các đối tượng di tích.
 * @param {Array<L.Marker>} markers - Mảng để lưu trữ các marker đang hiển thị.
 */
export function displayMarkersOnMap(mapInstance, heritages, markers) {
    // Xóa các marker cũ
    markers.forEach(marker => mapInstance.removeLayer(marker));
    markers.length = 0; // Xóa sạch mảng markers

    const validMarkers = [];

    heritages.forEach(heritage => {
        if (!heritage.toa_do) {
            console.warn('Di tích không có tọa độ:', heritage.ten);
            return;
        }

        const coords = parseCoordinates(heritage.toa_do);
        if (!coords) {
            return; // Cảnh báo đã được log trong parseCoordinates
        }

        const [lat, lng] = coords;
        if (isNaN(lat) || isNaN(lng)) {
            console.warn('Tọa độ không hợp lệ:', heritage.ten, lat, lng);
            return;
        }

        const color = getMarkerColor(heritage.loai_hinh);

        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-icon" style="background:${color};"><i class="fas fa-landmark"></i></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const marker = L.marker([lat, lng], { icon })
            .bindPopup(createPopupContent(heritage), {
                maxWidth: 400,
                minWidth: 300
            })
            .addTo(mapInstance);

        marker.heritageId = heritage.id; // <--- Gán ID để liên kết
        markers.push(marker);
        validMarkers.push(marker);
    });

    console.log(`Hiển thị ${validMarkers.length}/${heritages.length} di tích trên bản đồ.`);

    // Tự động zoom để thấy tất cả marker
    if (validMarkers.length > 0) {
        const group = new L.featureGroup(validMarkers);
        mapInstance.fitBounds(group.getBounds().pad(0.1));
    }
}

/**
 * Ẩn lớp phủ tải dữ liệu.
 */
export function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}
