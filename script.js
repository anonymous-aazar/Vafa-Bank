// ===================================================================================
// ============================= INITIALIZATION ======================================
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage with default admin and sample data if empty
    if (!localStorage.getItem('employees')) {
        const adminEmployee = [{
            fullName: 'Admin User',
            dob: '2000-01-01',
            email: 'admin@vafabank.com',
            userId: 'admin',
            password: 'vafa_admin00' 
        }];
        localStorage.setItem('employees', JSON.stringify(adminEmployee));
    }
    if (!localStorage.getItem('customers')) {
        localStorage.setItem('customers', JSON.stringify([]));
    }

    // Page-specific setup
    const path = window.location.pathname.split('/').pop();
    if (path === 'index.html' || path === '') {
        setupLoginPage();
    } else if (path === 'admin.html') {
        setupAdminPage();
    } else if (path === 'employee.html') {
        setupEmployeePage();
    } else if (path === 'customer.html') {
        setupCustomerPage();
    }
});

function getFromStorage(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getSessionUser() {
    return JSON.parse(sessionStorage.getItem('loggedInUser'));
}

function setSessionUser(user) {
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
}

function logout() {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
}

// ===================================================================================
// =============================== LOGIN PAGE ========================================
// ===================================================================================

function setupLoginPage() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = document.getElementById('loginUserId').value;
        const password = document.getElementById('loginPassword').value;

        const employees = getFromStorage('employees');
        const customers = getFromStorage('customers');

        // Check for admin/employee login
        const employee = employees.find(emp => (emp.userId === userId || emp.email === userId) && emp.password === password);
        if (employee) {
            setSessionUser({ type: 'employee', ...employee });
            if (employee.userId === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'employee.html';
            }
            return;
        }

        // Check for customer login
        const customer = customers.find(cust => (cust.customerId === userId || cust.email === userId) && cust.password === password);
        if (customer) {
            if(customer.status === 'pending') {
                alert('Your account is pending approval. Please contact the bank.');
                return;
            }
            setSessionUser({ type: 'customer', ...customer });
            window.location.href = 'customer.html';
            return;
        }

        alert('Invalid UserID or Password.');
    });
}

// ===================================================================================
// ================================ ADMIN PAGE =======================================
// ===================================================================================

function setupAdminPage() {
    const user = getSessionUser();
    if (!user || user.userId !== 'admin') {
        alert('Access denied.');
        window.location.href = 'index.html';
        return;
    }

    const createEmployeeForm = document.getElementById('createEmployeeForm');
    createEmployeeForm.addEventListener('submit', handleCreateEmployee);

    loadEmployees();
    loadPendingCustomers();
}

function handleCreateEmployee(e) {
    e.preventDefault();
    const fullName = document.getElementById('empFullName').value;
    const dob = document.getElementById('empDob').value;
    const email = document.getElementById('empEmail').value;
    const userId = document.getElementById('empUserId').value;

    if (!fullName || !dob || !email || !userId) {
        alert('Please fill all fields.');
        return;
    }

    const employees = getFromStorage('employees');
    if (employees.some(emp => emp.userId === userId || emp.email === email)) {
        alert('UserID or Email already exists.');
        return;
    }
    
    const password = `${userId}_${dob}`;
    const newEmployee = { fullName, dob, email, userId, password };
    employees.push(newEmployee);
    saveToStorage('employees', employees);

    alert(`Employee created successfully! Password: ${password}`);
    createEmployeeForm.reset();
    loadEmployees();
}

function loadEmployees() {
    const employees = getFromStorage('employees');
    const tableBody = document.querySelector('#employeeListTable tbody');
    tableBody.innerHTML = '';
    employees.forEach(emp => {
        if (emp.userId === 'admin') return; // Don't show admin in the list
        const row = `<tr>
            <td>${emp.fullName}</td>
            <td>${emp.userId}</td>
            <td>${emp.email}</td>
            <td>${emp.password}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

function loadPendingCustomers() {
    const customers = getFromStorage('customers');
    const pendingCustomers = customers.filter(c => c.status === 'pending');
    const tableBody = document.querySelector('#pendingCustomersTable tbody');
    tableBody.innerHTML = '';
    pendingCustomers.forEach(cust => {
        const row = `<tr>
            <td>${cust.customerId}</td>
            <td>${cust.fullName}</td>
            <td>${cust.accountType}</td>
            <td><button class="btn" onclick="approveCustomer('${cust.customerId}')">Approve</button></td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

function approveCustomer(customerId) {
    const customers = getFromStorage('customers');
    const customerIndex = customers.findIndex(c => c.customerId === customerId);
    if (customerIndex !== -1) {
        customers[customerIndex].status = 'approved';
        // Auto-generate a password for the customer upon approval
        customers[customerIndex].password = `${customers[customerIndex].customerId}_${customers[customerIndex].dob}`;
        saveToStorage('customers', customers);
        alert(`Customer ${customerId} approved! Password is ${customers[customerIndex].password}`);
        loadPendingCustomers();
    }
}

// ===================================================================================
// ============================== EMPLOYEE PAGE ======================================
// ===================================================================================

function setupEmployeePage() {
    const user = getSessionUser();
    if (!user || user.type !== 'employee' || user.userId === 'admin') {
        alert('Access denied.');
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('employeeName').textContent = user.fullName;

    // Event listeners
    document.getElementById('openAccountForm').addEventListener('submit', handleOpenAccount);
    document.getElementById('custAccountType').addEventListener('change', handleAccountTypeChange);
    document.getElementById('findAccountToUpdateForm').addEventListener('submit', findAccountToUpdate);
    document.getElementById('findAccountForTxnForm').addEventListener('submit', findAccountForTxn);
    document.getElementById('depositForm').addEventListener('submit', handleDeposit);
    document.getElementById('withdrawForm').addEventListener('submit', handleWithdraw);
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    document.getElementById('transferToAcc').addEventListener('blur', fetchReceiverName);
    document.getElementById('closeAccountForm').addEventListener('submit', handleCloseAccount);
}

// --- Tab Logic ---
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}


// --- Open Account Logic ---
function handleAccountTypeChange() {
    const accountType = document.getElementById('custAccountType').value;
    const conditionalFields = document.getElementById('conditionalFields');
    const overseasAddressGroup = document.getElementById('overseasAddressGroup');
    let fieldsHtml = '';

    const employmentFields = `
        <div class="form-group">
            <label>Employment Status</label>
            <select class="employmentStatus" onchange="handleEmploymentStatusChange(this)">
                <option value="employed">Employed</option>
                <option value="self-employed">Self-Employed</option>
            </select>
        </div>
        <div class="employment-details">
            <div class="form-group"><label>Office Address</label><input type="text" class="officeAddress"></div>
            <div class="form-group"><label>Designation</label><input type="text" class="designation"></div>
            <div class="form-group"><label>Annual Income</label><input type="number" class="annualIncome"></div>
        </div>`;

    overseasAddressGroup.classList.add('hidden');

    switch(accountType) {
        case 'Savings':
        case 'Salary':
            fieldsHtml = employmentFields;
            break;
        case 'Current':
            fieldsHtml = `
                <div class="form-group"><label>Business Address</label><input type="text" id="businessAddress"></div>
                <div class="form-group"><label>Description of Business</label><input type="text" id="businessDesc"></div>
                <div class="form-group"><label>Annual Income</label><input type="number" id="annualIncome"></div>`;
            break;
        case 'NRI':
            overseasAddressGroup.classList.remove('hidden');
            fieldsHtml = employmentFields;
            break;
    }
    conditionalFields.innerHTML = fieldsHtml;
}

function handleEmploymentStatusChange(selectElement) {
    const parent = selectElement.closest('.tab-content');
    const detailsDiv = parent.querySelector('.employment-details');
    if (selectElement.value === 'self-employed') {
        detailsDiv.innerHTML = `<div class="form-group"><label>Annual Income</label><input type="number" class="annualIncome"></div>`;
    } else {
        detailsDiv.innerHTML = `
            <div class="form-group"><label>Office Address</label><input type="text" class="officeAddress"></div>
            <div class="form-group"><label>Designation</label><input type="text" class="designation"></div>
            <div class="form-group"><label>Annual Income</label><input type="number" class="annualIncome"></div>`;
    }
}

function handleOpenAccount(e) {
    e.preventDefault();
    const form = e.target;
    const customers = getFromStorage('customers');

    const newCustomer = {
        customerId: `CUST${Date.now()}`,
        accountNumber: `1010${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        fullName: form.custFullName.value,
        address: form.custAddress.value,
        dob: form.custDob.value,
        maritalStatus: form.custMaritalStatus.value,
        email: form.custEmail.value,
        mobile: form.custMobile.value,
        telephone: form.custTelephone.value,
        nominee: form.custNominee.value,
        currency: form.custCurrency.value,
        accountType: form.custAccountType.value,
        balance: 0,
        status: 'pending', // Accounts are pending until admin approves
        transactions: [],
        password: '', // Password will be set on approval
    };

    if (newCustomer.accountType === 'NRI') {
        newCustomer.overseasAddress = form.custOverseasAddress.value;
    }
    
    // ... add logic to gather conditional fields data ...
    
    customers.push(newCustomer);
    saveToStorage('customers', customers);

    alert(`Account application submitted for ${newCustomer.fullName}!\nCustomer ID: ${newCustomer.customerId}\nAccount Number: ${newCustomer.accountNumber}\nWaiting for admin approval.`);
    form.reset();
}

// --- Update Account Logic ---
function findAccountToUpdate(e) {
    e.preventDefault();
    const accNum = document.getElementById('updateAccNum').value;
    const customers = getFromStorage('customers');
    const customer = customers.find(c => c.accountNumber === accNum);

    if (customer) {
        document.getElementById('updateDetailsSection').classList.remove('hidden');
        document.getElementById('updateCustName').textContent = customer.fullName;
        document.getElementById('updateAddress').value = customer.address;
        document.getElementById('updateMaritalStatus').value = customer.maritalStatus;
        document.getElementById('updateMobile').value = customer.mobile;

        document.getElementById('updateAccountForm').onsubmit = (event) => {
            event.preventDefault();
            const customerIndex = customers.findIndex(c => c.accountNumber === accNum);
            customers[customerIndex].address = document.getElementById('updateAddress').value;
            customers[customerIndex].maritalStatus = document.getElementById('updateMaritalStatus').value;
            customers[customerIndex].mobile = document.getElementById('updateMobile').value;
            saveToStorage('customers', customers);
            alert('Account details updated successfully!');
            document.getElementById('updateDetailsSection').classList.add('hidden');
            document.getElementById('findAccountToUpdateForm').reset();
        };
    } else {
        alert('Account not found.');
    }
}

// --- Transaction Logic ---
function findAccountForTxn(e) {
    e.preventDefault();
    const accNum = document.getElementById('txnAccNum').value;
    const customers = getFromStorage('customers');
    const customer = customers.find(c => c.accountNumber === accNum);

    if (customer) {
        document.getElementById('transactionOptions').classList.remove('hidden');
        document.getElementById('txnCustName').textContent = `${customer.fullName} (Balance: ₹${customer.balance})`;
        document.getElementById('transferFromAcc').value = accNum;
    } else {
        alert('Account not found.');
        document.getElementById('transactionOptions').classList.add('hidden');
    }
}

function handleDeposit(e) {
    e.preventDefault();
    const accNum = document.getElementById('txnAccNum').value;
    const amount = parseFloat(document.getElementById('depositAmount').value);
    
    const customers = getFromStorage('customers');
    const customerIndex = customers.findIndex(c => c.accountNumber === accNum);

    customers[customerIndex].balance += amount;
    customers[customerIndex].transactions.push({
        date: document.getElementById('depositDate').value,
        description: document.getElementById('depositDesc').value,
        deposit: amount,
        withdrawal: 0,
        balance: customers[customerIndex].balance
    });
    saveToStorage('customers', customers);
    alert(`₹${amount} deposited successfully.`);
    findAccountForTxn({ preventDefault: () => {} }); // Refresh display
    e.target.reset();
}

function handleWithdraw(e) {
    e.preventDefault();
    const accNum = document.getElementById('txnAccNum').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    
    const customers = getFromStorage('customers');
    const customerIndex = customers.findIndex(c => c.accountNumber === accNum);

    if (customers[customerIndex].balance < amount) {
        alert('Insufficient funds.');
        return;
    }

    customers[customerIndex].balance -= amount;
    customers[customerIndex].transactions.push({
        date: document.getElementById('withdrawDate').value,
        description: document.getElementById('withdrawDesc').value,
        deposit: 0,
        withdrawal: amount,
        balance: customers[customerIndex].balance
    });
    saveToStorage('customers', customers);
    alert(`₹${amount} withdrawn successfully.`);
    findAccountForTxn({ preventDefault: () => {} }); // Refresh display
    e.target.reset();
}

function fetchReceiverName() {
    const toAccNum = document.getElementById('transferToAcc').value;
    const customers = getFromStorage('customers');
    const receiver = customers.find(c => c.accountNumber === toAccNum);
    document.getElementById('receiverName').textContent = receiver ? receiver.fullName : 'Not Found';
}

function handleTransfer(e) {
    e.preventDefault();
    const fromAccNum = document.getElementById('transferFromAcc').value;
    const toAccNum = document.getElementById('transferToAcc').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const type = document.getElementById('transferType').value;
    
    const customers = getFromStorage('customers');
    const fromIndex = customers.findIndex(c => c.accountNumber === fromAccNum);
    const toIndex = customers.findIndex(c => c.accountNumber === toAccNum);

    if (fromIndex === -1 || toIndex === -1) {
        alert('Invalid account number.');
        return;
    }
    if (customers[fromIndex].balance < amount) {
        alert('Insufficient funds.');
        return;
    }

    // Update balances
    customers[fromIndex].balance -= amount;
    customers[toIndex].balance += amount;

    // Record transactions
    customers[fromIndex].transactions.push({
        date: new Date().toISOString().split('T')[0],
        description: `Transfer to ${customers[toIndex].fullName} (${type})`,
        deposit: 0,
        withdrawal: amount,
        balance: customers[fromIndex].balance
    });
     customers[toIndex].transactions.push({
        date: new Date().toISOString().split('T')[0],
        description: `Transfer from ${customers[fromIndex].fullName} (${type})`,
        deposit: amount,
        withdrawal: 0,
        balance: customers[toIndex].balance
    });
    
    saveToStorage('customers', customers);
    alert(`₹${amount} transferred successfully.`);
    findAccountForTxn({ preventDefault: () => {} }); // Refresh display
    e.target.reset();
    document.getElementById('receiverName').textContent = '';
}

// --- Close Account Logic ---
function handleCloseAccount(e) {
    e.preventDefault();
    const accNum = document.getElementById('closeAccNum').value;
    const custId = document.getElementById('closeCustId').value;
    
    let customers = getFromStorage('customers');
    const customerIndex = customers.findIndex(c => c.accountNumber === accNum && c.customerId === custId);

    if (customerIndex !== -1) {
        if (confirm(`Are you sure you want to close account ${accNum}?`)) {
            customers.splice(customerIndex, 1);
            saveToStorage('customers', customers);
            alert('Account closed successfully.');
            e.target.reset();
        }
    } else {
        alert('Account Number and Customer ID do not match.');
    }
}


// ===================================================================================
// ============================== CUSTOMER PAGE ======================================
// ===================================================================================

function setupCustomerPage() {
    const user = getSessionUser();
    if (!user || user.type !== 'customer') {
        alert('Access denied.');
        window.location.href = 'index.html';
        return;
    }
    
    // We need to get the latest user data from localStorage
    const customers = getFromStorage('customers');
    const currentUserData = customers.find(c => c.customerId === user.customerId);

    // Populate summary
    document.getElementById('customerName').textContent = currentUserData.fullName;
    document.getElementById('summaryAccNum').textContent = currentUserData.accountNumber;
    document.getElementById('summaryCustId').textContent = currentUserData.customerId;
    document.getElementById('summaryBalance').textContent = currentUserData.balance.toFixed(2);
    document.getElementById('custTransferFromAcc').value = currentUserData.accountNumber;

    loadPassbook(currentUserData);
    
    document.getElementById('customerTransferForm').addEventListener('submit', handleCustomerTransfer);
}

function loadPassbook(customer) {
    const passbookBody = document.querySelector('#passbookTable tbody');
    passbookBody.innerHTML = '';
    customer.transactions.forEach(txn => {
        const row = `<tr>
            <td>${txn.date}</td>
            <td>${txn.description}</td>
            <td>${txn.deposit > 0 ? `₹${txn.deposit.toFixed(2)}` : '-'}</td>
            <td>${txn.withdrawal > 0 ? `₹${txn.withdrawal.toFixed(2)}` : '-'}</td>
            <td>₹${txn.balance.toFixed(2)}</td>
        </tr>`;
        passbookBody.innerHTML += row;
    });
}

function handleCustomerTransfer(e) {
    e.preventDefault();
    const fromAccNum = document.getElementById('custTransferFromAcc').value;
    const toAccNum = document.getElementById('custTransferToAcc').value;
    const amount = parseFloat(document.getElementById('custTransferAmount').value);
    const type = document.getElementById('custTransferType').value;
    
    const customers = getFromStorage('customers');
    const fromIndex = customers.findIndex(c => c.accountNumber === fromAccNum);
    const toIndex = customers.findIndex(c => c.accountNumber === toAccNum);

    if (fromAccNum === toAccNum) {
        alert("Cannot transfer to your own account.");
        return;
    }
    if (toIndex === -1) {
        alert('Receiver account not found.');
        return;
    }
    if (customers[fromIndex].balance < amount) {
        alert('Insufficient funds.');
        return;
    }

    // Update balances
    customers[fromIndex].balance -= amount;
    customers[toIndex].balance += amount;

    // Record transactions
    customers[fromIndex].transactions.push({
        date: new Date().toISOString().split('T')[0],
        description: `Transfer to ${customers[toIndex].fullName} (${type})`,
        deposit: 0,
        withdrawal: amount,
        balance: customers[fromIndex].balance
    });
     customers[toIndex].transactions.push({
        date: new Date().toISOString().split('T')[0],
        description: `Transfer from ${customers[fromIndex].fullName} (${type})`,
        deposit: amount,
        withdrawal: 0,
        balance: customers[toIndex].balance
    });
    
    saveToStorage('customers', customers);
    alert(`₹${amount} transferred successfully!`);
    
    // Refresh page data
    setSessionUser({ type: 'customer', ...customers[fromIndex] }); // Update session
    setupCustomerPage(); // Reload UI components
    e.target.reset();
}