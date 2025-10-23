
/**
 * Hiển thị một danh sách các di tích trong một container trên sidebar.
 * @param {HTMLElement} container - Element để hiển thị danh sách vào.
 * @param {Array<object>} heritages - Mảng dữ liệu các di tích.
 * @param {L.Map} mapInstance - Đối tượng bản đồ Leaflet.
 * @param {Array<L.Marker>} markers - Mảng các marker đang hiển thị trên bản đồ.
 */
export function renderHeritageList(container, heritages, mapInstance, markers) {
    container.innerHTML = ''; // Xóa nội dung cũ

    if (heritages.length === 0) {
        container.innerHTML = '<div class="sidebar-placeholder">Không có di tích nào để hiển thị.</div>';
        return;
    }

    heritages.forEach(heritage => {
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.heritageId = heritage.id;

        const ten = heritage.ten || 'Chưa có tên';
        const diaChi = heritage.dia_chi_cu_the || 'Chưa có địa chỉ';

        item.innerHTML = `
            <div class="item-icon"><i class="fas fa-landmark"></i></div>
            <div class="item-details">
                <div class="item-name">${ten}</div>
                <div class="item-address">${diaChi}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            const targetMarker = markers.find(m => m.heritageId === heritage.id);
            if (targetMarker) {
                mapInstance.flyTo(targetMarker.getLatLng(), 16); // Zoom gần hơn
                targetMarker.openPopup();
            }
        });

        container.appendChild(item);
    });
}
