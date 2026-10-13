const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("HUYIP Backend đang hoạt động 🚀");
});

app.get("/api/status", (req, res) => {
    res.json({
        online: true,
        service: "HUYIP API",
        status: "OK"
    });
});

let timCongClicks = 0;
let twoFAClicks = 0;

app.post("/api/security/2fa", async (req, res) => {
    const now = new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh"
    });

    twoFAClicks++;
    console.log(`[${now}] [2FA] CLICK | HÔM NAY: ${twoFAClicks} lượt`);

    const requestId = "REQ-" + Date.now();
    console.log(`[${requestId}] [2FA] PROCESSING`);

    await new Promise(resolve => setTimeout(resolve, 2500));

    const success = Math.random() < 0.8;

    if (success) {
        console.log(`[${requestId}] [2FA] SUCCESS`);
        return res.json({
            success: true,
            requestId,
            status: "SUCCESS",
            message: "Thiết lập bảo mật 2 lớp thành công."
        });
    }

    console.log(`[${requestId}] [2FA] FAILED`);
    return res.status(400).json({
        success: false,
        requestId,
        status: "FAILED",
        message: "Thiết lập thất bại. Vui lòng thử lại."
    });
});

app.post("/api/log/tim-cong", (req, res) => {
    const now = new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh"
    });

    timCongClicks++;
    console.log(`[${now}] [TÌM CỔNG] CLICK | HÔM NAY: ${timCongClicks} lượt`);

    res.json({
        success: true,
        todayClicks: timCongClicks
    });
});

app.listen(PORT, () => {
    console.log(`HUYIP Server đang chạy tại http://localhost:${PORT}`);
});
