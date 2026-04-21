import express from "express"
import cors from "cors"
import { store } from "./store.js"
import { parseOtlpJson, parseOtlpProto } from "./otlp-parser.js"


export function createHttpReceiver(){
    const app = express();

    app.use(cors());
    app.use(express.raw({
        type : "*/*",
        limit : "10mb"
    }));

    app.post("/v1/traces",(req,res) => {

        try{
            const contentType = req.headers['content-type'] ?? '';
            const spans = contentType.includes('application/json')
                ? parseOtlpJson(req.body.toString())
                : parseOtlpProto(req.body);

            console.log("The span",req.body.toString())    
            
            if(spans.length > 0){
                store.ingest(spans);
                console.log(`[http] ingested ${spans.length} span(s)`);
            }
            res.status(200).json({});
        }catch(err){
            console.error('[http] parse error:', err.message);
            res.status(400).json({ error: err.message });
        }

    })

    app.post('/v1/metrics', (req, res) => res.status(200).json({}));
    app.post('/v1/logs',    (req, res) => res.status(200).json({}));

    return app;
    
}