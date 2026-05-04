// Chạy đoạn code này trong Console của browser (F12)
// để xóa token cũ và reset trạng thái đăng nhập

localStorage.removeItem('token');
localStorage.removeItem('user');
console.log('Đã xóa token cũ. Vui lòng refresh trang và đăng nhập lại.');

// Sau đó refresh trang (F5) và đăng nhập lại