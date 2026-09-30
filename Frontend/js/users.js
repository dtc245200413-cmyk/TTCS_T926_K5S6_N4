// ===============================
// DỮ LIỆU MẪU
// ===============================

let users = [
    {
        id: 1,
        fullName: "Nguyễn Văn A",
        username: "nguyenvana",
        email: "nguyenvana@gmail.com",
        role: "INTERVIEWER",
        status: "active"
    },
    {
        id: 2,
        fullName: "Trần Thị B",
        username: "tranthib",
        email: "tranthib@gmail.com",
        role: "HR",
        status: "active"
    },
    {
        id: 3,
        fullName: "Lê Văn C",
        username: "levanc",
        email: "levanc@gmail.com",
        role: "INTERVIEWER",
        status: "inactive"
    }
];


// ===============================
// CẤU HÌNH PHÂN TRANG
// ===============================

const PAGE_SIZE = 20;

let currentPage = 1;

let filteredUsers = [...users];


// ===============================
// LẤY CÁC ELEMENT HTML
// ===============================

const searchInput = document.getElementById("searchInput");

const statusFilter = document.getElementById("statusFilter");

const searchButton = document.getElementById("searchButton");

const resetButton = document.getElementById("resetButton");

const createButton = document.getElementById("createButton");

const userTableBody = document.getElementById("userTableBody");

const previousButton = document.getElementById("previousButton");

const nextButton = document.getElementById("nextButton");

const pageInfo = document.getElementById("pageInfo");


// Form
const userModal = document.getElementById("userModal");

const userForm = document.getElementById("userForm");

const formTitle = document.getElementById("formTitle");

const closeFormButton = document.getElementById("closeFormButton");

const cancelFormButton = document.getElementById("cancelFormButton");

const fullNameInput = document.getElementById("fullName");

const usernameInput = document.getElementById("username");

const emailInput = document.getElementById("email");

const roleInput = document.getElementById("role");

const statusInput = document.getElementById("status");


// ===============================
// CHUYỂN TÊN VAI TRÒ
// ===============================

function getRoleName(role) {

    if (role === "ADMIN") {
        return "Quản trị viên";
    }

    if (role === "HR") {
        return "Nhân sự";
    }

    if (role === "INTERVIEWER") {
        return "Người phỏng vấn";
    }

    return role;
}


// ===============================
// CHUYỂN TÊN TRẠNG THÁI
// ===============================

function getStatusName(status) {

    if (status === "active") {
        return "Đang hoạt động";
    }

    return "Không hoạt động";
}


// ===============================
// HIỂN THỊ DANH SÁCH
// ===============================

function renderUsers() {

    userTableBody.innerHTML = "";

    const totalPages =
        Math.max(
            1,
            Math.ceil(filteredUsers.length / PAGE_SIZE)
        );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const start =
        (currentPage - 1) * PAGE_SIZE;

    const end =
        start + PAGE_SIZE;

    const pageUsers =
        filteredUsers.slice(start, end);


    // Không có dữ liệu
    if (pageUsers.length === 0) {

        userTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Không tìm thấy tài khoản
                </td>
            </tr>
        `;

    } else {

        pageUsers.forEach(function (user, index) {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${start + index + 1}</td>

                <td>${user.fullName}</td>

                <td>${user.username}</td>

                <td>${user.email}</td>

                <td>${getRoleName(user.role)}</td>

                <td class="${
                    user.status === "active"
                        ? "status-active"
                        : "status-inactive"
                }">
                    ${getStatusName(user.status)}
                </td>

                <td>
                    <button
                        type="button"
                        class="edit-button"
                        data-id="${user.id}">
                        Sửa
                    </button>
                </td>
            `;

            userTableBody.appendChild(row);
        });
    }


    // Thông tin trang
    pageInfo.textContent =
        `Trang ${currentPage} / ${totalPages}`;


    // Nút Previous
    previousButton.disabled =
        currentPage === 1;


    // Nút Next
    nextButton.disabled =
        currentPage === totalPages;
}


// ===============================
// TÌM KIẾM + BỘ LỌC
// ===============================

function searchUsers() {

    const keyword =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedStatus =
        statusFilter.value;


    filteredUsers = users.filter(function (user) {

        const matchKeyword =

            user.fullName
                .toLowerCase()
                .includes(keyword)

            ||

            user.username
                .toLowerCase()
                .includes(keyword)

            ||

            user.email
                .toLowerCase()
                .includes(keyword);


        const matchStatus =

            selectedStatus === ""

            ||

            user.status === selectedStatus;


        return matchKeyword && matchStatus;
    });


    currentPage = 1;

    renderUsers();
}


// ===============================
// ĐẶT LẠI TÌM KIẾM
// ===============================

function resetSearch() {

    searchInput.value = "";

    statusFilter.value = "";

    filteredUsers = [...users];

    currentPage = 1;

    renderUsers();
}


// ===============================
// MỞ FORM TẠO
// ===============================

function openCreateForm() {

    userForm.reset();

    formTitle.textContent =
        "Tạo tài khoản";

    statusInput.value =
        "active";

    userModal.classList.add("show");

    fullNameInput.focus();
}


// ===============================
// ĐÓNG FORM
// ===============================

function closeForm() {

    userModal.classList.remove("show");

    userForm.reset();
}


// ===============================
// MỞ FORM SỬA
// ===============================

function openEditForm(id) {

    const user =
        users.find(function (item) {

            return item.id === id;

        });


    if (!user) {
        return;
    }


    formTitle.textContent =
        "Sửa tài khoản";


    fullNameInput.value =
        user.fullName;

    usernameInput.value =
        user.username;

    emailInput.value =
        user.email;

    roleInput.value =
        user.role;

    statusInput.value =
        user.status;


    userModal.classList.add("show");

    fullNameInput.focus();
}


// ===============================
// CLICK NÚT SỬA
// ===============================

userTableBody.addEventListener(
    "click",
    function (event) {

        if (
            event.target.classList.contains(
                "edit-button"
            )
        ) {

            const id =
                Number(
                    event.target.dataset.id
                );

            openEditForm(id);
        }
    }
);


// ===============================
// CLICK TẠO
// ===============================

createButton.addEventListener(
    "click",
    openCreateForm
);


// ===============================
// CLICK TÌM KIẾM
// ===============================

searchButton.addEventListener(
    "click",
    searchUsers
);


// ===============================
// ENTER ĐỂ TÌM KIẾM
// ===============================

searchInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            searchUsers();
        }
    }
);


// ===============================
// CLICK ĐẶT LẠI
// ===============================

resetButton.addEventListener(
    "click",
    resetSearch
);


// ===============================
// TRANG TRƯỚC
// ===============================

previousButton.addEventListener(
    "click",
    function () {

        if (currentPage > 1) {

            currentPage--;

            renderUsers();
        }
    }
);


// ===============================
// TRANG SAU
// ===============================

nextButton.addEventListener(
    "click",
    function () {

        const totalPages =
            Math.ceil(
                filteredUsers.length / PAGE_SIZE
            );


        if (currentPage < totalPages) {

            currentPage++;

            renderUsers();
        }
    }
);


// ===============================
// ĐÓNG FORM - NÚT X
// ===============================

closeFormButton.addEventListener(
    "click",
    closeForm
);


// ===============================
// ĐÓNG FORM - NÚT HỦY
// ===============================

cancelFormButton.addEventListener(
    "click",
    closeForm
);


// ===============================
// LƯU FORM
// ===============================

userForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        alert(
            "Đã lưu thông tin tài khoản."
        );

        closeForm();
    }
);


// ===============================
// CLICK RA NGOÀI FORM ĐỂ ĐÓNG
// ===============================

userModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target === userModal
        ) {

            closeForm();
        }
    }
);


// ===============================
// KHỞI TẠO TRANG
// ===============================

renderUsers();