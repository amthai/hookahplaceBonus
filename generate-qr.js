const QRCode = require('qrcode');
const fs = require('fs');

async function generateQRCode() {
    const qrData = 'HOOKAH_PLACE_QR';
    
    try {
        // Генерируем QR код как PNG файл
        await QRCode.toFile('./public/qr-code.png', qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        console.log('✅ QR код успешно создан: ./public/qr-code.png');
        console.log('📱 Данные QR кода:', qrData);
        console.log('🏪 Распечатайте QR код и разместите в заведении');
        
    } catch (error) {
        console.error('❌ Ошибка создания QR кода:', error);
    }
}

generateQRCode();
