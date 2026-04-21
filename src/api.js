import { Router } from "express"
import { store } from "./store.js"

export function createApiRouter(){
    const router = Router();

    router.get("/traces",(req,res) =>{
        res.json(store.list());
    })

    router.get("/trace/:traceId",(req,res) => {
        const trace = store.get(req.params.traceId);

        if (!trace) return res.status(404).json({ error: 'trace not found' });
        res.json(trace);
    })

    router.delete("/traces",(req,res) =>{
        store.clear();
        res.json({ ok: true });
    })

    return router;
}