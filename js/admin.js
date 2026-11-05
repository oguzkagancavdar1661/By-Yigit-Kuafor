/* ===================================================================
   BY YİĞİT KUAFÖR - YÖNETİCİ GÜVENLİK & RANDEVU TAKİP MOTORU
   - Şifreli Yetkili Girişi (Auth Gate)
   - Oturum Yönetimi & Güvenli Çıkış
   - Şifre Değiştirme
   - Randevu Filtreleme, Durum Değiştirme ve Excel/CSV Aktarımı
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. AUTH & SECURITY LOGIC
    // -------------------------------------------------------------
    const DEFAULT_ADMIN_PASS = "yigit25"; // Erzurum plaka + isim varsayılan şifresi
    const authOverlay = document.getElementById('authOverlay');
    const adminMainContent = document.getElementById('adminMainContent');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const btnAdminLogin = document.getElementById('btnAdminLogin');
    const authErrorMessage = document.getElementById('authErrorMessage');
    const togglePassVisibility = document.getElementById('togglePassVisibility');
    const btnAdminLogout = document.getElementById('btnAdminLogout');

    // Change Password Elements
    const changePassModal = document.getElementById('changePassModal');
    const btnOpenChangePass = document.getElementById('btnOpenChangePass');
    const btnCancelChangePass = document.getElementById('btnCancelChangePass');
    const btnSaveNewPass = document.getElementById('btnSaveNewPass');
    const currentPassInput = document.getElementById('currentPassInput');
    const newPassInput = document.getElementById('newPassInput');

    function getAdminPassword() {
        return localStorage.getItem('by_yigit_admin_pwd') || DEFAULT_ADMIN_PASS;
    }

    function checkAuth() {
        const isAuth = sessionStorage.getItem('by_yigit_admin_auth') === 'true';
        if (isAuth) {
            if (authOverlay) authOverlay.style.display = 'none';
            if (adminMainContent) adminMainContent.style.display = 'block';
            fetchAppointments();
        } else {
            if (authOverlay) authOverlay.style.display = 'flex';
            if (adminMainContent) adminMainContent.style.display = 'none';
            if (adminPasswordInput) adminPasswordInput.focus();
        }
    }

    function handleLogin() {
        const enteredPass = adminPasswordInput ? adminPasswordInput.value.trim() : '';
        const realPass = getAdminPassword();

        if (enteredPass === realPass) {
            sessionStorage.setItem('by_yigit_admin_auth', 'true');
            if (authErrorMessage) authErrorMessage.style.display = 'none';
            checkAuth();
        } else {
            if (authErrorMessage) {
                authErrorMessage.style.display = 'block';
                authErrorMessage.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Hatalı şifre! Bu alana yalnızca işletme sahibi girebilir.';
            }
            if (adminPasswordInput) {
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
            }
        }
    }

    if (btnAdminLogin) {
        btnAdminLogin.addEventListener('click', handleLogin);
    }

    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    if (togglePassVisibility && adminPasswordInput) {
        togglePassVisibility.addEventListener('click', () => {
            if (adminPasswordInput.type === 'password') {
                adminPasswordInput.type = 'text';
                togglePassVisibility.classList.remove('fa-eye');
                togglePassVisibility.classList.add('fa-eye-slash');
            } else {
                adminPasswordInput.type = 'password';
                togglePassVisibility.classList.remove('fa-eye-slash');
                togglePassVisibility.classList.add('fa-eye');
            }
        });
    }

    if (btnAdminLogout) {
        btnAdminLogout.addEventListener('click', () => {
            sessionStorage.removeItem('by_yigit_admin_auth');
            checkAuth();
        });
    }

    // Password Change Modal
    if (btnOpenChangePass && changePassModal) {
        btnOpenChangePass.addEventListener('click', () => {
            changePassModal.classList.add('active');
            if (currentPassInput) currentPassInput.value = '';
            if (newPassInput) newPassInput.value = '';
        });
    }

    if (btnCancelChangePass && changePassModal) {
        btnCancelChangePass.addEventListener('click', () => {
            changePassModal.classList.remove('active');
        });
    }

    if (btnSaveNewPass) {
        btnSaveNewPass.addEventListener('click', () => {
            const current = currentPassInput ? currentPassInput.value.trim() : '';
            const newP = newPassInput ? newPassInput.value.trim() : '';
            const realPass = getAdminPassword();

            if (current !== realPass) {
                alert('Mevcut şifrenizi yanlış girdiniz!');
                return;
            }

            if (!newP || newP.length < 4) {
                alert('Yeni şifre en az 4 karakter olmalıdır.');
                return;
            }

            localStorage.setItem('by_yigit_admin_pwd', newP);
            alert('Yönetici şifreniz başarıyla güncellendi.');
            if (changePassModal) changePassModal.classList.remove('active');
        });
    }

    // -------------------------------------------------------------
    // 2. APPOINTMENTS & DASHBOARD LOGIC
    // -------------------------------------------------------------
    let appointments = [];
    const tableBody = document.getElementById('appointmentsTableBody');
    const filterDateInput = document.getElementById('filterDate');
    const filterStatusSelect = document.getElementById('filterStatus');
    const searchInput = document.getElementById('searchCustomer');
    const btnResetFilters = document.getElementById('btnResetFilters');

    // Metrics elements
    const metricTodayCount = document.getElementById('metricTodayCount');
    const metricTotalCount = document.getElementById('metricTotalCount');
    const metricTotalRevenue = document.getElementById('metricTotalRevenue');
    const metricCompletedCount = document.getElementById('metricCompletedCount');

    // Fetch appointments from API or fallback
    async function fetchAppointments() {
        try {
            const res = await fetch('/api/appointments');
            if (!res.ok) throw new Error();
            appointments = await res.json();
        } catch (e) {
            appointments = JSON.parse(localStorage.getItem('by_yigit_appointments') || '[]');
        }
        applyFiltersAndRender();
        calculateMetrics();
    }

    // Calculate Metrics
    function calculateMetrics() {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayList = appointments.filter(a => a.date === todayStr && a.status !== 'İptal Edildi');
        const completedList = appointments.filter(a => a.status === 'Tamamlandı');
        const activeList = appointments.filter(a => a.status !== 'İptal Edildi');

        const totalRevenue = activeList.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

        if (metricTodayCount) metricTodayCount.textContent = todayList.length;
        if (metricTotalCount) metricTotalCount.textContent = appointments.length;
        if (metricTotalRevenue) metricTotalRevenue.textContent = `${totalRevenue.toLocaleString('tr-TR')} ₺`;
        if (metricCompletedCount) metricCompletedCount.textContent = completedList.length;
    }

    // Render Table
    function renderTable(list) {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);">
                        <i class="fa-solid fa-calendar-xmark" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                        Kayıtlı randevu bulunamadı.
                    </td>
                </tr>
            `;
            return;
        }

        list.forEach(item => {
            const tr = document.createElement('tr');
            
            let statusBadgeClass = 'status-confirmed';
            if (item.status === 'Tamamlandı') statusBadgeClass = 'status-completed';
            if (item.status === 'İptal Edildi') statusBadgeClass = 'status-cancelled';

            const [y, m, d] = item.date.split('-');
            const formattedDate = `${d}.${m}.${y}`;

            tr.innerHTML = `
                <td><strong style="color:var(--gold-primary); font-family:monospace;">${item.id}</strong></td>
                <td>
                    <div style="font-weight:600; color:var(--text-white);">${item.customerName}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">
                        <a href="tel:${item.customerPhone}" style="color:inherit;"><i class="fa-solid fa-phone"></i> ${item.customerPhone}</a>
                    </div>
                </td>
                <td>
                    <div style="font-weight:600;">${item.serviceName}</div>
                    <div style="font-size:0.8rem; color:var(--gold-light);">${item.price} ₺ &bull; ${item.duration}</div>
                </td>
                <td>
                    <div style="font-weight:600; color:var(--text-white);">${formattedDate}</div>
                    <div style="font-size:0.82rem; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> ${item.time}</div>
                </td>
                <td>
                    <span class="badge-status ${statusBadgeClass}">${item.status}</span>
                </td>
                <td style="max-width:180px; font-size:0.82rem; color:var(--text-muted);">
                    ${item.notes ? item.notes : '<em style="opacity:0.5">-</em>'}
                </td>
                <td>
                    <div class="action-buttons-group">
                        <button class="btn-action btn-act-complete" title="Tamamlandı olarak işaretle" onclick="updateStatus('${item.id}', 'Tamamlandı')">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <a href="https://wa.me/${item.customerPhone.replace(/[^0-9]/g, '')}?text=Merhaba%20${encodeURIComponent(item.customerName)},%20By%20Yi%C4%9Fit%20Kuaf%C3%B6r%20randevunuz%20i%C3%A7in%20yaz%C4%B1yoruz..." target="_blank" class="btn-action btn-act-whatsapp" title="Müşteriye WhatsApp'tan Yaz">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                        <button class="btn-action btn-act-cancel" title="Randevuyu İptal Et" onclick="updateStatus('${item.id}', 'İptal Edildi')">
                            <i class="fa-solid fa-ban"></i>
                        </button>
                        <button class="btn-action btn-act-delete" title="Kayıttan Sil" onclick="deleteAppointment('${item.id}')">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Filter Logic
    function applyFiltersAndRender() {
        let filtered = [...appointments];

        const dateVal = filterDateInput ? filterDateInput.value : '';
        const statusVal = filterStatusSelect ? filterStatusSelect.value : '';
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (dateVal) {
            filtered = filtered.filter(item => item.date === dateVal);
        }

        if (statusVal) {
            filtered = filtered.filter(item => item.status === statusVal);
        }

        if (searchVal) {
            filtered = filtered.filter(item => 
                item.customerName.toLowerCase().includes(searchVal) ||
                item.customerPhone.includes(searchVal) ||
                item.id.toLowerCase().includes(searchVal)
            );
        }

        renderTable(filtered);
    }

    // Event Listeners for Filters
    if (filterDateInput) filterDateInput.addEventListener('change', applyFiltersAndRender);
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', applyFiltersAndRender);
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);

    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', () => {
            if (filterDateInput) filterDateInput.value = '';
            if (filterStatusSelect) filterStatusSelect.value = '';
            if (searchInput) searchInput.value = '';
            applyFiltersAndRender();
        });
    }

    // Global Actions
    window.updateStatus = async function(id, newStatus) {
        try {
            const res = await fetch(`/api/appointments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const index = appointments.findIndex(a => a.id === id);
                if (index !== -1) appointments[index].status = newStatus;
            } else {
                throw new Error();
            }
        } catch (e) {
            const index = appointments.findIndex(a => a.id === id);
            if (index !== -1) {
                appointments[index].status = newStatus;
                localStorage.setItem('by_yigit_appointments', JSON.stringify(appointments));
            }
        }
        applyFiltersAndRender();
        calculateMetrics();
    };

    window.deleteAppointment = async function(id) {
        if (!confirm(`${id} numaralı randevuyu silmek istediğinize emin misiniz?`)) return;

        try {
            const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                appointments = appointments.filter(a => a.id !== id);
            } else {
                throw new Error();
            }
        } catch (e) {
            appointments = appointments.filter(a => a.id !== id);
            localStorage.setItem('by_yigit_appointments', JSON.stringify(appointments));
        }
        applyFiltersAndRender();
        calculateMetrics();
    };

    // Export to CSV
    const btnExportCsv = document.getElementById('btnExportCsv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            let csv = "ID,Musteri,Telefon,Hizmet,Ucret,Tarih,Saat,Durum,Notlar\n";
            appointments.forEach(a => {
                csv += `"${a.id}","${a.customerName}","${a.customerPhone}","${a.serviceName}","${a.price}","${a.date}","${a.time}","${a.status}","${(a.notes||'').replace(/"/g, '""')}"\n`;
            });

            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `By_Yigit_Kuafor_Randevular_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Check Auth on load
    checkAuth();
});
