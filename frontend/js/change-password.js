const form = document.getElementById("changePasswordForm");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const currentPassword = document
        .getElementById("currentPassword")
        .value.trim();

    const newPassword = document
        .getElementById("newPassword")
        .value.trim();

    const confirmPassword = document
        .getElementById("confirmPassword")
        .value.trim();


    const currentPasswordError =
        document.getElementById("currentPasswordError");

    const newPasswordError =
        document.getElementById("newPasswordError");

    const confirmPasswordError =
        document.getElementById("confirmPasswordError");


    // Xóa lỗi cũ
    currentPasswordError.innerText = "";
    newPasswordError.innerText = "";
    confirmPasswordError.innerText = "";

    let isValid = true;


    // Kiểm tra mật khẩu hiện tại
    if (currentPassword === "") {
        currentPasswordError.innerText =
            "Vui lòng nhập mật khẩu hiện tại.";

        isValid = false;
    }


    // Kiểm tra mật khẩu mới
    if (newPassword === "") {
        newPasswordError.innerText =
            "Vui lòng nhập mật khẩu mới.";

        isValid = false;

    } else if (newPassword.length < 8) {
        newPasswordError.innerText =
            "Mật khẩu phải có ít nhất 8 ký tự.";

        isValid = false;

    } else {
        const hasLetter = /[A-Za-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (!hasLetter || !hasNumber) {
            newPasswordError.innerText =
                "Mật khẩu phải bao gồm cả chữ và số.";

            isValid = false;
        }
    }


    // Kiểm tra xác nhận mật khẩu
    if (confirmPassword === "") {
        confirmPasswordError.innerText =
            "Vui lòng xác nhận mật khẩu mới.";

        isValid = false;

    } else if (confirmPassword !== newPassword) {
        confirmPasswordError.innerText =
            "Mật khẩu xác nhận không khớp.";

        isValid = false;
    }


    // Nếu dữ liệu hợp lệ
    if (isValid) {
        alert("Thông tin mật khẩu hợp lệ!");

        // Sau này sẽ gọi RESTful API đổi mật khẩu ở đây.
    }
});