document.addEventListener('DOMContentLoaded', () => {
    // Definir as credenciais de login para demonstração
    const validUsername = "admin";
    const validPassword = "123";

    // Seletores de elementos do DOM
    const loginForm       = document.getElementById('login-form');
    const errorMessage    = document.getElementById('error-message');
    const logoutBtn       = document.getElementById('logout-btn');
    const sections        = document.querySelectorAll('.content-section');
    const menuItems       = document.querySelectorAll('.sidebar .menu li');
    const form            = document.getElementById('client-form');
    const ordersTableBody = document.querySelector('#orders-table tbody');
    const recentOrdersTableBody = document.getElementById('recent-orders-table-body');
    const exportExcelBtn    = document.getElementById('export-excel-btn');
    const settingsForm      = document.getElementById('settings-form');
    const backupBtn         = document.getElementById('backup-btn');
    const restoreBtn        = document.getElementById('restore-btn');
    const restoreFileInput  = document.getElementById('restore-file-input');
    const pdfPreviewModal   = document.getElementById('pdf-preview-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const downloadPdfBtn    = document.getElementById('download-pdf-btn');
    const submitBtn         = document.getElementById('submit-order-btn');

    // Seletores da seção de Relatórios
    const reportStartDate    = document.getElementById('report-start-date');
    const reportEndDate      = document.getElementById('report-end-date');
    const generateReportBtn  = document.getElementById('generate-report-btn');
    const reportResults      = document.querySelector('.report-results');
    const totalReportOS      = document.getElementById('total-report-os');
    const totalReportRevenue = document.getElementById('total-report-revenue');
    const revenueChartCtx    = document.getElementById('revenue-chart') ? document.getElementById('revenue-chart').getContext('2d') : null;
    let revenueChart;

    let currentEditingOrderId = null;

    // Funções de utilidade
    const showSection = (sectionId) => {
        sections.forEach(section => section.style.display = 'none');
        document.getElementById(sectionId).style.display = 'block';
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === sectionId) {
                item.classList.add('active');
            }
        });
    };

    const generateUniqueId = () => 'TS' + Date.now();

    // Funções de manipulação de dados no localStorage
    const getOrders = () => JSON.parse(localStorage.getItem('serviceOrders')) || [];
    const saveOrders = (orders) => localStorage.setItem('serviceOrders', JSON.stringify(orders));
    const getSettings = () => JSON.parse(localStorage.getItem('settings')) || { companyName: 'TechShip', defaultTech: '', defaultWarranty: 90 };
    const saveSettings = (settings) => localStorage.setItem('settings', JSON.stringify(settings));

    // Funções de CRUD (Create, Read, Update, Delete)
    const saveNewOrder = (order) => {
        const orders = getOrders();
        order.id = generateUniqueId();
        order.status = 'Em Aberto';
        orders.push(order);
        saveOrders(orders);
        Swal.fire('Sucesso!', 'Ordem de Serviço salva com sucesso!', 'success');
        form.reset();
        updateDashboard();
        loadOrders();
    };

    const updateOrder = (orderId, updatedOrder) => {
        let orders = getOrders();
        const index = orders.findIndex(order => order.id === orderId);
        if (index !== -1) {
            orders[index] = { ...orders[index], ...updatedOrder };
            saveOrders(orders);
            Swal.fire('Sucesso!', 'Ordem de Serviço atualizada com sucesso!', 'success');
            form.reset();
            updateDashboard();
            loadOrders();
            currentEditingOrderId = null;
            submitBtn.textContent = 'Salvar OS';
        }
    };

    const editOrder = (id) => {
        const orders = getOrders();
        const order = orders.find(o => o.id === id);
        if (order) {
            form['client-name'].value = order.clientName;
            form['client-phone'].value = order.clientPhone;
            form['client-email'].value = order.clientEmail;
            form['equipment-brand'].value = order.equipmentBrand;
            form['equipment-model'].value = order.equipmentModel;
            form['equipment-serial'].value = order.equipmentSerial;
            form['equipment-accessories'].value = order.equipmentAccessories;
            form['equipment-password'].value = order.equipmentPassword;
            form['equipment-condition'].value = order.equipmentCondition;
            form['problem-description'].value = order.problemDescription;
            form['technical-notes'].value = order.technicalNotes;
            form['service-value'].value = order.serviceValue;
            form['payment-method'].value = order.paymentMethod;
            form['estimated-delivery'].value = order.estimatedDelivery;

            submitBtn.textContent = 'Atualizar OS';
            currentEditingOrderId = id;
            
            showSection('new-client-section');
        }
    };

    const loadOrders = () => {
        const orders = getOrders();
        ordersTableBody.innerHTML = '';
        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhuma Ordem de Serviço cadastrada.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.clientName}</td>
                <td>${order.equipmentBrand}</td>
                <td>${order.problemDescription}</td>
                <td>R$ ${order.serviceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${new Date(order.estimatedDelivery).toLocaleDateString('pt-BR')}</td>
                <td><span class="status ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-action btn-edit" data-id="${order.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-action btn-delete" data-id="${order.id}"><i class="fas fa-trash-alt"></i></button>
                    <button class="btn btn-action btn-pdf" data-id="${order.id}"><i class="fas fa-file-pdf"></i></button>
                </td>
            `;
            ordersTableBody.appendChild(row);
        });

        ordersTableBody.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => editOrder(e.currentTarget.dataset.id));
        });
        ordersTableBody.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => deleteOrder(e.currentTarget.dataset.id));
        });
        ordersTableBody.querySelectorAll('.btn-pdf').forEach(button => {
            button.addEventListener('click', (e) => generatePDF(e.currentTarget.dataset.id));
        });
    };

    const deleteOrder = (id) => {
        Swal.fire({
            title: 'Tem certeza?',
            text: "Você não poderá reverter isso!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                let orders = getOrders();
                orders = orders.filter(order => order.id !== id);
                saveOrders(orders);
                loadOrders();
                updateDashboard();
                Swal.fire('Excluído!', 'A Ordem de Serviço foi excluída.', 'success');
            }
        });
    };

    // Funções do Dashboard
    const updateDashboard = () => {
        const orders = getOrders();
        const totalClients = orders.length;
        const openOrders = orders.filter(order => order.status === 'Em Aberto').length;
        const completedOrders = orders.filter(order => order.status === 'Concluído').length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.serviceValue, 0);

        if (document.getElementById('total-clients')) {
            document.getElementById('total-clients').textContent = totalClients;
            document.getElementById('open-orders').textContent = openOrders;
            document.getElementById('completed-orders').textContent = completedOrders;
            document.getElementById('total-revenue').textContent = `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            loadRecentOrders(orders);
        }
    };

    const loadRecentOrders = (orders) => {
        const recentOrders = orders.slice(-5).reverse();
        recentOrdersTableBody.innerHTML = '';
        if (recentOrders.length === 0) {
            recentOrdersTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma Ordem de Serviço recente.</td></tr>';
            return;
        }

        recentOrders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.clientName}</td>
                <td>${order.equipmentBrand}</td>
                <td>${new Date(order.estimatedDelivery).toLocaleDateString('pt-BR')}</td>
                <td><span class="status ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
            `;
            recentOrdersTableBody.appendChild(row);
        });
    };

    // Funções de Relatórios
    const generateReport = () => {
        const orders = getOrders();
        const startDate = reportStartDate.value ? new Date(reportStartDate.value) : null;
        const endDate = reportEndDate.value ? new Date(reportEndDate.value) : null;

        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.estimatedDelivery);
            if (startDate && orderDate < startDate) return false;
            if (endDate && orderDate > endDate) return false;
            return true;
        });

        const totalOrders = filteredOrders.length;
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.serviceValue, 0);

        totalReportOS.textContent = totalOrders;
        totalReportRevenue.textContent = `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        const monthlyRevenue = filteredOrders.reduce((acc, order) => {
            const date = new Date(order.estimatedDelivery);
            const month = `${date.getMonth() + 1}/${date.getFullYear()}`;
            acc[month] = (acc[month] || 0) + order.serviceValue;
            return acc;
        }, {});

        const labels = Object.keys(monthlyRevenue).sort((a, b) => {
            const [m1, y1] = a.split('/').map(Number);
            const [m2, y2] = b.split('/').map(Number);
            if (y1 !== y2) return y1 - y2;
            return m1 - m2;
        });
        const data = labels.map(label => monthlyRevenue[label]);

        if (revenueChart) {
            revenueChart.destroy();
        }

        if (revenueChartCtx) {
            revenueChart = new Chart(revenueChartCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Receita por Mês',
                        data: data,
                        backgroundColor: 'rgba(0, 123, 255, 0.5)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        x: {
                            ticks: {
                                color: '#e2e8f0'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#e2e8f0'
                            },
                            title: {
                                display: true,
                                text: 'Receita (R$)',
                                color: '#e2e8f0'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { 
                                color: '#e2e8f0' // Cor clara para o texto da legenda
                            }
                        }
                    }
                }
            });
        }
        reportResults.style.display = 'block';
    };

    // Funções de Backup e Restauração
    const backupData = () => {
        const orders = getOrders();
        const settings = getSettings();
        const data = {
            serviceOrders: orders,
            settings: settings
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_TechShip_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Swal.fire('Sucesso!', 'Backup de dados realizado com sucesso!', 'success');
    };

    const restoreData = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.serviceOrders) {
                    saveOrders(data.serviceOrders);
                }
                if (data.settings) {
                    saveSettings(data.settings);
                }
                Swal.fire('Sucesso!', 'Dados restaurados com sucesso!', 'success').then(() => {
                    updateDashboard();
                    loadOrders();
                });
            } catch (error) {
                Swal.fire('Erro', 'Arquivo de backup inválido.', 'error');
            }
        };
        reader.readAsText(file);
    };

    // Funções de PDF
    const generatePDF = (id) => {
        const orders = getOrders();
        const order = orders.find(o => o.id === id);
        const settings = getSettings();
        if (!order) {
            Swal.fire('Erro', 'Ordem de Serviço não encontrada.', 'error');
            return;
        }

        const pdfContent = `
            <div style="font-family: Arial, sans-serif; padding: 12px; border: 1px solid #ccc; max-width: 800px; margin: auto;">
                <h1 style="text-align: center; color: #000;">Ordem de Serviço - ${settings.companyName}</h1>
                <p style="text-align: right; font-size: 0.9em; color: #666;">ID da OS: ${order.id}</p>
                <hr>
                
                <h2 style="color: #000; margin-top: 12px;"> 1. Dados do Cliente </h2>
                <p> <strong> Nome:     </strong> ${order.clientName}           </p>
                <p> <strong> Telefone: </strong> ${order.clientPhone}          </p>
                <p> <strong> E-mail:   </strong> ${order.clientEmail || 'N/A'} </p>

                <h2 style="color: #000; margin-top: 12px;"> 2. Informações do Equipamento </h2>
                <p> <strong> Marca:                    </strong> ${order.equipmentBrand}                </p>
                <p> <strong> Modelo:                   </strong> ${order.equipmentModel}                </p>
                <p> <strong> Número de Série:          </strong> ${order.equipmentSerial}               </p>
                <p> <strong> Acessórios Entregues:     </strong> ${order.equipmentAccessories || 'N/A'} </p>
                <p> <strong> Senha:                    </strong> ${order.equipmentPassword || 'N/A'}    </p>
                <p> <strong> Estado Físico na Entrada: </strong> ${order.equipmentCondition}            </p>

                <h2 style="color: #000; margin-top: 12px;"> 3. Detalhes do Problema </h2>
                <p>${order.problemDescription}</p>

                <h2 style="color: #000; margin-top: 12px;"> 4. Observações Técnicas </h2>
                <p>${order.technicalNotes || 'N/A'}</p>
                
                <h2 style="color: #000; margin-top: 12px;"> 5. Valor Total e Forma de Pagamento </h2>
                <p> <strong> Valor Total:        </strong> R$ ${order.serviceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p> <strong> Forma de Pagamento: </strong> ${order.paymentMethod}</p>
                
                <h2 style="color: #000; margin-top: 12px;"> 6. Prazo Estimado de Entrega </h2>
                <p> <strong> Data: </strong> ${new Date(order.estimatedDelivery).toLocaleDateString('pt-BR')}</p>

                <div style="font-size: 0.8em;">
                    <h2 style="color: #000; margin-top: 15px;"> 7. Termos e Condições </h2>
                    <p>01. O equipamento foi recebido para análise e possível reparo, sem garantia de solução do problema.</p>
                    <p>02. O cliente declara estar ciente de que o prazo de entrega é estimado e pode variar conforme a complexidade do serviço.</p>
                    <p>03. A garantia do serviço é de ${settings.defaultWarranty || 90} dias, cobrindo apenas o serviço realizado e não se estendendo a danos ou mau uso posterior ao serviço.</p>
                    <p>04. Caso sejam identificados danos adicionais durante o reparo, o cliente será notificado para autorizar qualquer serviço adicional.</p>
                    <p>05. A senha fornecida será utilizada exclusivamente para testes e será apagada após a finalização do serviço.</p>
                    <p>06. Após a finalização do serviço, o cliente será notificado para a retirada do equipamento no prazo máximo de 15 dias.</p>
                    <p>07. Em caso de não retirada do equipamento no prazo de 30 dias após a notificação, poderá ser cobrada uma taxa de armazenamento diária.</p>
                    <p>08. A TechShip reserva-se o direito de recusar serviços que envolvam riscos à segurança ou à integridade de seus técnicos ou equipamentos.</p>
                    <p>09. O pagamento deve ser efetuado na retirada do equipamento, salvo acordo prévio com a empresa.</p>
                    <p>10. Nosso compromisso é com a transparência e a satisfação do cliente. Todas as dúvidas podem ser esclarecidas com nossa equipe.</p>
                    <p>11. O cliente concorda com os termos acima.</p>
                </div>
                
                <div style="margin-top: 40px; text-align: center;">
                    <p>___________________________________</p>
                    <p>Assinatura do Cliente</p>
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <p>___________________________________</p>
                    <p>Assinatura do Técnico: ${settings.defaultTech}</p>
                </div>
            </div>
        `;

        document.getElementById('pdf-preview-content').innerHTML = pdfContent;
        pdfPreviewModal.style.display = 'block';

        downloadPdfBtn.onclick = () => {
            const element = document.getElementById('pdf-preview-content');
            html2pdf(element, {
                margin: 10,
                filename: `OS_${order.id}_${settings.companyName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            });
        };
    };

    // Função para exportar dados para Excel
    const exportToExcel = () => {
        const orders = getOrders();
        if (orders.length === 0) {
            Swal.fire('Atenção', 'Não há dados para exportar.', 'info');
            return;
        }

        const data = orders.map(order => ({
            'ID da OS': order.id,
            'Nome do Cliente': order.clientName,
            'Telefone': order.clientPhone,
            'E-mail': order.clientEmail,
            'Marca': order.equipmentBrand,
            'Modelo': order.equipmentModel,
            'Número de Série': order.equipmentSerial,
            'Acessórios': order.equipmentAccessories,
            'Senha': order.equipmentPassword,
            'Estado Físico': order.equipmentCondition,
            'Descrição do Problema': order.problemDescription,
            'Observações Técnicas': order.technicalNotes,
            'Valor Total': order.serviceValue,
            'Forma de Pagamento': order.paymentMethod,
            'Prazo de Entrega': new Date(order.estimatedDelivery).toLocaleDateString('pt-BR'),
            'Status': order.status
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ordens de Serviço');
        XLSX.writeFile(wb, 'ordens_de_servico_TechShip.xlsx');

        Swal.fire('Sucesso!', 'Dados exportados para Excel com sucesso!', 'success');
    };

    // Lógica de Login e Logout
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = e.target.username.value;
            const password = e.target.password.value;
            if (username === validUsername && password === validPassword) {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'index.html';
            } else {
                errorMessage.style.display = 'block';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.setItem('isLoggedIn', 'false');
            window.location.href = 'login.html';
        });
    }

    // Inicialização da aplicação
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'login.html';
        } else {
            showSection('dashboard-section');
            updateDashboard();

            // Eventos principais do Painel
            menuItems.forEach(item => {
                item.addEventListener('click', () => {
                    const section = item.getAttribute('data-section');
                    showSection(section);
                    if (section === 'service-orders-section') {
                        loadOrders();
                    } else if (section === 'dashboard-section') {
                        updateDashboard();
                    } else if (section === 'reports-section') {
                        reportResults.style.display = 'none';
                    }
                });
            });

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const orderData = {
                    clientName: form['client-name'].value,
                    clientPhone: form['client-phone'].value,
                    clientEmail: form['client-email'].value,
                    equipmentBrand: form['equipment-brand'].value,
                    equipmentModel: form['equipment-model'].value,
                    equipmentSerial: form['equipment-serial'].value,
                    equipmentAccessories: form['equipment-accessories'].value,
                    equipmentPassword: form['equipment-password'].value,
                    equipmentCondition: form['equipment-condition'].value,
                    problemDescription: form['problem-description'].value,
                    technicalNotes: form['technical-notes'].value,
                    serviceValue: parseFloat(form['service-value'].value),
                    paymentMethod: form['payment-method'].value,
                    estimatedDelivery: form['estimated-delivery'].value,
                };

                if (currentEditingOrderId) {
                    updateOrder(currentEditingOrderId, orderData);
                } else {
                    saveNewOrder(orderData);
                }
            });

            // Eventos da seção de Relatórios
            if (generateReportBtn) {
                generateReportBtn.addEventListener('click', generateReport);
            }
            
            // Eventos de Backup e Restauração
            if (backupBtn) {
                backupBtn.addEventListener('click', backupData);
            }
            if (restoreBtn) {
                restoreBtn.addEventListener('click', () => restoreFileInput.click());
            }
            if (restoreFileInput) {
                restoreFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        restoreData(file);
                    }
                });
            }

            // Eventos de Configurações
            if (settingsForm) {
                settingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const settings = {
                        companyName: settingsForm['company-name'].value,
                        defaultTech: settingsForm['default-tech'].value,
                        defaultWarranty: parseInt(settingsForm['default-warranty'].value, 10),
                    };
                    saveSettings(settings);
                    Swal.fire('Sucesso!', 'Configurações salvas com sucesso!', 'success');
                });
            }

            // Evento de exportar para Excel
            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', exportToExcel);
            }

            // Eventos para fechar o modal
            if (closeModalButtons) {
                closeModalButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        pdfPreviewModal.style.display = 'none';
                    });
                });
            }
            if (pdfPreviewModal) {
                window.addEventListener('click', (e) => {
                    if (e.target === pdfPreviewModal) {
                        pdfPreviewModal.style.display = 'none';
                    }
                });
            }
        }
    }
});