// script.js

// --- DỮ LIỆU Q&A CỦA BẠN (Giữ nguyên hoặc cập nhật) ---
const knowledgeBase = [
    {
        keywords: ["bạn là ai", "tên gì", "giới thiệu bản thân", "quang là ai"],
        answer: "Chào bạn, tôi là Nguyễn Tuấn Quang, một Kỹ sư chuyên ngành Tự Động Hóa. Rất vui được làm quen!",
    },
    // ... (Thêm các câu hỏi và câu trả lời khác của bạn ở đây) ...
    {
        keywords: ["cảm ơn", "thank you", "cám ơn","oke"],
        answer: "Rất vui khi được hỗ trợ bạn! 😊"
    },
];

const fallbackAnswers = [
    "Xin lỗi, mình chưa hiểu câu hỏi của bạn. Bạn có thể diễn đạt khác được không?",
    "Hiện tại mình chưa có thông tin về vấn đề này. Bạn thử hỏi câu khác nhé.",
];
// --- KẾT THÚC DỮ LIỆU Q&A ---

// Biến lưu trữ lịch sử chat cho API (quan trọng!)
// Định dạng: [{ role: "user", parts: [{text: "..."}] }, { role: "model", parts: [{text: "..."}] }]
let chatHistoryForAPI = [];


document.addEventListener('DOMContentLoaded', function() {
    const chatbox = document.getElementById('aiChatbox');
    const chatboxHeader = document.getElementById('chatboxHeader');
    // Sửa lại cách lấy chatboxToggleIcon nếu nó nằm trực tiếp trong chatboxHeader
    // Hoặc đảm bảo HTML của bạn có một element con với ID/class phù hợp cho icon
    const chatboxToggleIconElement = document.getElementById('chatboxToggleIcon'); // Giả sử đây là span chứa icon
    const chatboxToggleIcon = chatboxToggleIconElement ? chatboxToggleIconElement.querySelector('i') : null;

    // Lấy các phần tử cho việc chat
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');


    // --- PHẦN LOGIC TOGGLE CHATBOX (Code của bạn - giữ nguyên và điều chỉnh nếu cần) ---
    if (chatbox && chatboxToggleIcon) { // Kiểm tra chatbox và icon tồn tại
        const isInitiallyCollapsed = chatbox.classList.contains('collapsed');
        if (isInitiallyCollapsed) {
            chatboxToggleIcon.classList.remove('fa-chevron-up');
            chatboxToggleIcon.classList.add('fa-chevron-down');
        } else {
            chatboxToggleIcon.classList.remove('fa-chevron-down');
            chatboxToggleIcon.classList.add('fa-chevron-up');
        }

        if (chatboxHeader) {
            chatboxHeader.addEventListener('click', function() {
                chatbox.classList.toggle('collapsed');

                if (chatbox.classList.contains('collapsed')) {
                    chatboxToggleIcon.classList.remove('fa-chevron-up');
                    chatboxToggleIcon.classList.add('fa-chevron-down');
                    if (window.innerWidth <= 480 && chatbox.classList.contains('fullscreen-mobile')) {
                        chatbox.classList.remove('fullscreen-mobile');
                    }
                } else {
                    chatboxToggleIcon.classList.remove('fa-chevron-down');
                    chatboxToggleIcon.classList.add('fa-chevron-up');
                    if (window.innerWidth <= 480) {
                        // chatbox.classList.add('fullscreen-mobile'); // Tùy chọn
                    }
                }
            });
        }
    }

    // Xử lý resize (Code của bạn - giữ nguyên)
    window.addEventListener('resize', function() {
        if (chatbox && window.innerWidth > 480 && chatbox.classList.contains('fullscreen-mobile')) {
            chatbox.classList.remove('fullscreen-mobile');
        }
    });
    // --- KẾT THÚC LOGIC TOGGLE CHATBOX ---


    // --- PHẦN LOGIC XỬ LÝ CHAT (THÊM VÀO TỪ HƯỚNG DẪN API) ---
    function addMessageToChat(text, senderClass) {
        if (!chatMessages) { // Kiểm tra xem chatMessages có tồn tại không
            console.error("Không tìm thấy phần tử #chatMessages để thêm tin nhắn.");
            return;
        }

        const messageDiv = document.createElement('div');
        if (senderClass !== 'bot-typing') {
            const existingTypingMessage = chatMessages.querySelector('.bot-typing');
            if (existingTypingMessage) {
                existingTypingMessage.remove();
            }
        }
        
        messageDiv.classList.add('message', senderClass);
        
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function getBotResponse(userText) {
        const lowerUserText = userText.toLowerCase().trim();
        if (lowerUserText === "") return null;

        for (const item of knowledgeBase) {
            for (const keyword of item.keywords) {
                if (lowerUserText.includes(keyword.toLowerCase())) {
                    chatHistoryForAPI.push({ role: "user", parts: [{text: userText}] });
                    chatHistoryForAPI.push({ role: "model", parts: [{text: item.answer}] });
                    if (chatHistoryForAPI.length > 20) {
                        chatHistoryForAPI = chatHistoryForAPI.slice(-20);
                    }
                    return item.answer;
                }
            }
        }

        try {
            addMessageToChat("Bot đang suy nghĩ...", 'bot-typing');
            const functionUrl = '/.netlify/functions/get-gemini-response'; 
            
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userMessage: userText,
                    history: chatHistoryForAPI
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Lỗi không xác định từ server" }));
                console.error("Lỗi API từ Netlify Function:", response.status, errorData);
                addMessageToChat(`Lỗi: ${errorData.error || response.statusText}`, 'bot-message');
                return null;
            }

            const data = await response.json();
            chatHistoryForAPI.push({ role: "user", parts: [{text: userText}] });
            chatHistoryForAPI.push({ role: "model", parts: [{text: data.botResponse}] });
            if (chatHistoryForAPI.length > 20) {
                 chatHistoryForAPI = chatHistoryForAPI.slice(-20);
            }
            return data.botResponse;

        } catch (error) {
            console.error("Lỗi khi gọi Netlify function:", error);
            const typingMessage = chatMessages ? chatMessages.querySelector('.bot-typing') : null;
            if (typingMessage) typingMessage.remove();
            addMessageToChat("Xin lỗi, đã có lỗi kết nối. Vui lòng thử lại sau.", 'bot-message');
            return null; 
        }
    }

    async function handleSendMessage() {
        if (!userInput) { // Kiểm tra userInput tồn tại
            console.error("Không tìm thấy phần tử #userInput.");
            return;
        }
        const userText = userInput.value.trim();
        if (userText === "") return;

        addMessageToChat(userText, 'user-message');
        userInput.value = "";

        const botText = await getBotResponse(userText);
        if (botText) { 
            addMessageToChat(botText, 'bot-message');
        }
    }

    if (sendMessageBtn && userInput) {
        sendMessageBtn.addEventListener('click', handleSendMessage);
        userInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                handleSendMessage();
            }
        });
    } else {
        // Ghi log nếu không tìm thấy nút gửi hoặc ô nhập liệu, giúp gỡ lỗi HTML
        if (!sendMessageBtn) console.warn("Không tìm thấy phần tử #sendMessageBtn.");
        if (!userInput) console.warn("Không tìm thấy phần tử #userInput.");
    }
    // --- KẾT THÚC LOGIC XỬ LÝ CHAT ---
});