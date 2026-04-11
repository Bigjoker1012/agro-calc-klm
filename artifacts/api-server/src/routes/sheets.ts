import { Router, type IRouter } from "express";
import { getSheetData, getHistory, appendHistory, type HistoryRecord } from "../lib/sheets";

const router: IRouter = Router();

router.get("/sheets/data", async (_req, res) => {
  try {
    const data = await getSheetData();
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/sheets/history", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 500);
    const records = await getHistory(limit);
    res.json({ ok: true, records });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/sheets/history", async (req, res) => {
  try {
    const record: HistoryRecord = req.body;
    if (!record.productCode || !record.cultureCode) {
      res.status(400).json({ ok: false, error: "productCode and cultureCode required" });
      return;
    }
    await appendHistory(record);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
