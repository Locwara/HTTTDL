import { supabase, CLOUDINARY_CONFIG } from './config.js';

let tempMarker = null;
let isSelectingLocation = false;
let selectedFiles = [];
let addMapInstance; // To hold the map instance passed from index.html

export function initAddHeritage(map) {
    addMapInstance = map;
    // Clear any existing markers from other sections
    if (tempMarker) {
        addMapInstance.removeLayer(tempMarker);
        tempMarker = null;
    }
    // Remove previous event listener to prevent multiple bindings
    addMapInstance.off('click', bambando);
    addMapInstance.on('click', bambando);
    populateStaticDropdowns();
    document.getElementById('selectLocationBtn').addEventListener('click', layvitritrenmap);
    document.getElementById('heritageForm').addEventListener('submit', guiform);
    document.getElementById('hinh_anh').addEventListener('change', chonfile);
    document.getElementById('imagePreview').addEventListener('click', xoaanh);

    // Thêm event listener cho việc nhập tọa độ thủ công
    document.getElementById('latitude').addEventListener('blur', updateLocationFromInputs);
    document.getElementById('longitude').addEventListener('blur', updateLocationFromInputs);
}

/**
 * Hàm chung để xử lý khi có tọa độ mới (từ bản đồ hoặc nhập tay)
 * @param {number} lat - Vĩ độ
 * @param {number} lng - Kinh độ
 */
function handleNewCoordinates(lat, lng) {
    // Cập nhật giá trị vào form
    document.getElementById('latitude').value = lat.toFixed(7);
    document.getElementById('longitude').value = lng.toFixed(7);

    // Xóa marker cũ nếu có
    if (tempMarker) {
        addMapInstance.removeLayer(tempMarker);
    }

    // Tạo marker mới và hiển thị popup
    tempMarker = L.marker([lat, lng])
        .addTo(addMapInstance)
        .bindPopup(`Vị trí đã chọn: <br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        .openPopup();

    // Di chuyển bản đồ tới vị trí mới
    addMapInstance.flyTo([lat, lng], 16);

    // Lấy địa chỉ từ tọa độ
    laydiachitutoado(lat, lng);

    // Tắt chế độ chọn vị trí nếu đang bật
    if (isSelectingLocation) {
        isSelectingLocation = false;
        const btn = document.getElementById('selectLocationBtn');
        btn.innerHTML = '<i class = "fas fa-map-marker-alt"></i> Chọn vị trí trên bản đồ';
        btn.classList.remove('active');
        addMapInstance.getContainer().style.cursor = '';
    }
}

/**
 * Được gọi khi người dùng rời khỏi ô nhập kinh độ hoặc vĩ độ
 */
function updateLocationFromInputs() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);

    // Chỉ thực hiện khi cả hai đều là số hợp lệ
    if (!isNaN(lat) && !isNaN(lng)) {
        handleNewCoordinates(lat, lng);
    }
}

async function populateStaticDropdowns() {
    await loadAndFillSelect('loai_hinh', 'loai_hinh_id', 'ten_loai', 'id');
    await loadAndFillSelect('thoi_ky', 'thoi_ky_id', 'ten_thoi_ky', 'id');
    await loadAndFillSelect('ton_giao', 'ton_giao_id', 'ten_ton_giao', 'id');
}

async function loadAndFillSelect(tableName, selectId, textField, valueField) {
    const selectElement = document.getElementById(selectId);
    try {
        const { data, error } = await supabase.from(tableName).select(`${valueField}, ${textField}`).order(textField);
        if (error) throw error;
        selectElement.innerHTML = `<option value="">-- Chọn một mục --</option>`;
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error(`Lỗi khi tải dữ liệu cho ${tableName}:`, error);
        selectElement.innerHTML = `<option value="">Không tải được dữ liệu</option>`;
    }
}

function layvitritrenmap() {
    const btn = document.getElementById('selectLocationBtn');
    const status = document.getElementById('locationStatus');

    if (isSelectingLocation) {
        isSelectingLocation = false;
        btn.innerHTML = '<i class = "fas fa-map-marker-alt"></i> Chọn vị trí trên bản đồ';
        btn.classList.remove('active');
        status.style.display = 'none';
        addMapInstance.getContainer().style.cursor = '';
        if (tempMarker) {
            addMapInstance.removeLayer(tempMarker);
            tempMarker = null;
        }
    } else { 
        isSelectingLocation = true;
        btn.innerHTML = '<i class = "fas fa-times"></i> Hủy chọn vị trí';
        btn.classList.add('active');
        status.style.display = 'block';
        status.innerHTML = '<i class = "fas fa-hand-pointer"></i> Click vào bản đồ để chọn vị trí:';
        status.className = 'status-message status-info';
        addMapInstance.getContainer().style.cursor = 'crosshair';
    }
}

function bambando(e) {
    if (isSelectingLocation) {
        const { lat, lng } = e.latlng;
        handleNewCoordinates(lat, lng); // Sử dụng hàm chung
    }
}

async function laydiachitutoado(lat, lng) {
    const status = document.getElementById('locationStatus');
    status.innerHTML = '<i class = "fas fa-spinner fa-spin"></i> Đang tìm địa chỉ...';
    status.className = 'status-message status-info';

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`);
        const data = await response.json();
        if (!data || !data.address) throw new Error('Không tìm thấy thông tin địa chỉ');

        const address = data.address;
        const displayName = data.display_name || '';
        document.getElementById('dia_chi_cu_the').value = displayName;

        const provinceName = address.state || address.province || address.city || address.county || '';
        document.getElementById('tinh_tp_text').value = provinceName;

        let communeName = '';
        const communeRegex = /(?:Phường|Xã|Thị trấn|Quận|Huyện)\s+([^,]+)/;
        const communeMatch = displayName.match(communeRegex);

        if (communeMatch && communeMatch[1]) {
            communeName = communeMatch[1].trim();
        }
        
        if (!communeName) {
            communeName = address.suburb || address.quarter || address.commune || address.town || address.village || address.hamlet || address.neighbourhood || address.city_district || address.municipality || '';
        }

        if (provinceName && provinceName === communeName) {
            communeName = '';
        }

        document.getElementById('xa_phuong_text').value = communeName;

        status.innerHTML = `<i class = "fas fa-check"></i> Đã tự động điền địa chỉ.`;
        status.className = 'status-message status-success';

    } catch (error) {
        console.error('Lỗi khi lấy thông tin địa chỉ:', error);
        status.innerHTML = `<i class = "fas fa-exclamation-triangle"></i> Lỗi: ${error.message}`;
        status.className = 'status-message status-error';
    }
}

async function kiemtratontai(provinceName, communeName){
    if(!provinceName) throw new Error("Tên Tỉnh/Thành phố không được để trống");
    let {data: provinceData, error: provinceError} = await supabase
        .from('tinh_tp')
        .select('id')
        .eq('ten', provinceName)
        .single();
    if(provinceError && provinceError.code !== 'PGRST116') throw provinceError;
    let provinceId;
    if(provinceData) {
        provinceId = provinceData.id;
    }else{
        let{data: newProvinceData, error: newProvinceError} = await supabase
            .from('tinh_tp')
            .insert({ten: provinceName})
            .select('id')
            .single();
        if(newProvinceError) throw newProvinceError;
        provinceId = newProvinceData.id;
    }                
    if(!communeName) return {xa_id: null}
    let{data: communeData, error: communeError } = await supabase
        .from('xa_phuong')
        .select('id')
        .eq('ten', communeName)
        .eq('tinh_id', provinceId)
        .single();
    if(communeError && communeError.code !== 'PGRST116') throw communeError;
    let communeId;
    if(communeData){
        communeId = communeData.id;
    
    }else{
        let{data: newCommuneData, error: newCommuneError } = await supabase
            .from('xa_phuong')
            .insert({ten: communeName,  tinh_id: provinceId})
            .select('id')
            .single();
        if (newCommuneError) throw newCommuneError;
        communeId = newCommuneData.id
    }
    return {xa_id: communeId};
}

function chonfile(event){
    const files = event.target.files;
    const imagePreviewContainer = document.getElementById('imagePreview');

    for (const file of files){
        if(!file.type.startsWith('image/')) continue;
        const fileId = `file-${Date.now()} -${Math.random().toString(36).substr(2, 9)}`;
        file.id = fileId;
        selectedFiles.push(file);
        const reader = new FileReader();

        reader.onload = (e) =>{
            const previewItem = createImagePreview(e.target.result, file.name, file.id);
            imagePreviewContainer.appendChild(previewItem);
        };

        reader.readAsDataURL(file);
    }
}

function createImagePreview(src, name, fileId){
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.dataset.fileId = fileId;
    const img = document.createElement('img');
    img.src = src;
    img.className = 'preview-image';
    const nameLabel = document.createElement('div')
    nameLabel.className = 'preview-name';
    nameLabel.textContent = name;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.type='button';

    previewItem.appendChild(img);
    previewItem.appendChild(nameLabel);
    previewItem.appendChild(removeBtn);
    return previewItem;
}

function xoaanh(event){
    if(event.target.classList.contains('remove-image-btn')){
        const previewItem = event.target.closest('.preview-item');
        const fileId = previewItem.dataset.fileId;

        selectedFiles = selectedFiles.filter(file => file.id !== fileId);
        previewItem.remove();
    }
}

async function upfile(file, heritageId){
    const formData = new FormData();
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', `di_tich/${heritageId}`);
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        {
            method: 'POST',
            body: formData
        }
    );

    if(!response.ok){
        throw new Error(`Lỗi upload ảnh ${file.name}`);
    }
    const data = await response.json();
    return data.secure_url;
}

async function upanhs(heritageId){
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.style.display = 'block';
    progressDiv.innerHTML = `
        <div>Đang upload ${selectedFiles.length} ảnh...</div>
        <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
    `;
    const imageData = [];
    let uploaded = 0;

    for (const file of selectedFiles){
        try{
            const url = await upfile(file, heritageId);
            imageData.push({
                di_tich_id: heritageId,
                url: url,
                mo_ta: `Ảnh ${file.name}`
            });
            uploaded ++;
            const progress = (uploaded/selectedFiles.length) *100;
            progressDiv.querySelector('.progress-fill').style.width = `${progress}%`;
            progressDiv.querySelector('div').textContent = `Đã upload ${uploaded}/${selectedFiles.length} ảnh`;
        } catch (error){
            console.error(`Lỗi upload ${file.name}: `, error);
            throw new Error(`Không thể upload ảnh ${file.name}`);
        }
    }
    progressDiv.innerHTML = '<i class = "fas fa-check"></i> Upload ảnh thành công !';
    setTimeout(() => {
        progressDiv.style.display = 'none';
    }, 2000);
    return imageData;
}

async function guiform(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('formMessage');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class = "fas fa-spinner fa-spin"></i> Đang lưu' ;
    messageDiv.style.display = 'none'
    try{
        const provinceName = document.getElementById('tinh_tp_text').value;
        const communeName = document.getElementById('xa_phuong_text').value;
        const { xa_id } = await kiemtratontai(provinceName, communeName);
        const newHeritage = {
            ten: document.getElementById('ten').value,
            dia_chi_cu_the: document.getElementById('dia_chi_cu_the').value,
            toa_do: `POINT(${parseFloat(document.getElementById('longitude').value)} ${parseFloat(document.getElementById('latitude').value)})`,
            xa_id: xa_id || null, 
            loai_hinh_id: document.getElementById('loai_hinh_id').value ||null,
            thoi_ky_id: document.getElementById('thoi_ky_id').value || null,
            ton_giao_id: document.getElementById('ton_giao_id').value || null
        };

        if(!newHeritage.ten || !newHeritage.toa_do) throw new Error('Tên di tích và tọa độ là bắt buộc.');

        // Phải select() để lấy lại toàn bộ dữ liệu vừa insert, bao gồm cả các trường join
        const { data, error } = await supabase.from('di_tich').insert([newHeritage]).select(`
            *,
            xa_phuong:xa_id(ten, tinh_tp:tinh_id(ten)),
            loai_hinh:loai_hinh_id(ten_loai),
            thoi_ky:thoi_ky_id(ten_thoi_ky),
            ton_giao:ton_giao_id(ten_ton_giao),
            hinh_anh(url, mo_ta)
        `).single();

        if(error) throw error;

        const newHeritageRecord = data;

        if(selectedFiles.length > 0){
            // Gán mảng hình ảnh rỗng để tránh lỗi khi join
            newHeritageRecord.hinh_anh = []; 
            const imageData = await upanhs(newHeritageRecord.id);
            const {data: savedImages, error: imageError } = await supabase.from('hinh_anh').insert(imageData).select();
            if(imageError){
                console.error('Lỗi khi lưu thông tin ảnh:', imageError);
                throw new Error(`Thêm di tích thành công nhưng lưu ảnh thất bại: ${imageError.message}`);
            }
            // Cập nhật thông tin hình ảnh cho record mới
            newHeritageRecord.hinh_anh = savedImages;
        }

        // Phát sự kiện để các module khác biết có di tích mới
        document.dispatchEvent(new CustomEvent('heritageAdded', { detail: newHeritageRecord }));

        messageDiv.innerHTML = `<i class="fas fa-check-circle"></i> Thêm di tích "${newHeritageRecord.ten}" thành công!`;
        messageDiv.className = 'status-message status-success';
        messageDiv.style.display = 'block';
        document.getElementById('heritageForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        selectedFiles= [];
        if (tempMarker){
            addMapInstance.removeLayer(tempMarker);
            tempMarker = null;
        }
    } catch (error) {
        console.error('Lỗi khi thêm di tích:', error);
        messageDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Lỗi: ${error.message}`;
        messageDiv.className = 'status-message status-error';
        messageDiv.style.display = 'block';
    }
}