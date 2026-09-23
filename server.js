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
require("./security-sync").installSecurityRoutes(app);

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
