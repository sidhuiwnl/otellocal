import { EventEmitter } from "events"

import {ananlyzeSpan,resetAnalyzer,recordSample} from "./analyzer.js"

const MAX_TRACES = 200;
const TTL_MS = 30 * 60_000; // drop traces older than 30 min


class TraceStore extends EventEmitter{

    constructor(){
        super();

        // Map<traceId, TraceRecord>

        this._traces = new Map();

        setInterval(() => this._evict(), 5 * 60_000)
    }

    async ingest(spans){
        const touched = new Set();

        for (const span of spans){
            const tid = span.traceId;
            if(!this._traces.has(tid)){
                if(this._traces.size >= MAX_TRACES) this._evictOldest();

                this._traces.set(tid,{
                    traceId: tid,
                    rootName: null,
                    service: null,
                    startMs: Infinity,
                    endMs: -Infinity,
                    hasError: false,
                    spans: [],
                    logs:  [],
                    createdAt: Date.now(),
                })
            }

            const record = this._traces.get(tid);
            const startMs = nanosToMs(span.startTimeUnixNano);
            const endMs   = nanosToMs(span.endTimeUnixNano);
            const durMs   = endMs - startMs
            

            const service = getAttr(span.resource?.attributes,'service.name') ?? "unknown";

            recordSample(span.name,durMs);
            const analysis = ananlyzeSpan(span.name, durMs)

            record.spans.push({
                spanId:       span.spanId,
                parentSpanId: span.parentSpanId ?? null,
                name:         span.name,
                startMs,
                endMs,
                durationMs:   endMs - startMs,
                attributes:   flattenAttrs(span.attributes),
                status:       span.status ?? { code: 0 },
                kind:         span.kind ?? 0,
                service,
                analysis
            });

            if(!span.parentSpanId) record.rootName = span.name;
            record.service   = record.service ?? service;
            record.startMs   = Math.min(record.startMs, startMs);
            record.endMs     = Math.max(record.endMs,   endMs);
            record.hasError  = record.hasError || span.status?.code === 2;

            touched.add(tid);
        }

        for(const tid of touched){
            this.emit("trace:update",this._traces.get(tid));
        }

        

    }

    ingestLogs(logs) {
        for (const log of logs) {
        const trace = this._traces.get(log.traceId)
        if (!trace) continue  // log arrived before its trace — drop it
        trace.logs.push(log)
        // Don't emit a full trace:update for every log — UI polls logs separately
        }
    }


    _evict(){
        const cut_off = Date.now() - TTL_MS; //

        for(const [id, t] of this._traces){
            if(t.createdAt < cut_off) this._traces.delete(id);
        }
    }

    _evictOldest(){
        let oldest = null;

        for (const [id,t] of this._traces){
            if(!oldest || t.createdAt < oldest.createdAt) oldest = { id, t }
        }

        if(oldest) this._traces.delete(oldest.id)
    }

    clear(){
        this._traces.clear();
        resetAnalyser() 
        this.emit("store:clear");

    }

    getAll() {
    return [...this._traces.values()]
  }

    list(){
        return [...this._traces.values()]
            .sort((a,b) => b.startMs - a.startMs)
            .map(summarize)
    }

    get(traceId){
         const t = this._traces.get(traceId);
         if (!t) return null;

         return {
            ...summarize(t),
            spans: [...t.spans].sort((a, b) => a.startMs - b.startMs),
            logs:  [...t.logs].sort((a, b) => a.timestampMs - b.timestampMs),
         }
    }
}


function summarize(t){
    // t is a full trace

    return {
        traceId : t.traceId,
        rootName : t.rootName ?? t.span[0]?.name ?? "unknown",
        service:    t.service ?? 'unknown',
        durationMs: t.endMs === -Infinity ? 0 : t.endMs - t.startMs,
        startMs:    t.startMs === Infinity ? Date.now() : t.startMs,
        spanCount:  t.spans.length,
        hasError:   t.hasError,
    }
}


function flattenAttrs(attrs) {
  if (!attrs) return {};
  const out = {};
  for (const a of attrs) {
    const v = a.value;
    out[a.key] = v?.stringValue ?? v?.intValue ?? v?.doubleValue ?? v?.boolValue ?? '';
  }
  return out;
}



function nanosToMs(nano){
     if (!nano) return Date.now();
     
     // in otel the time comes in nano second so this converts it into milliseconds
     return Number(BigInt(nano) / 1_000_000n);
}

function getAttr(attrs,key){

     //
    //    [
  //        { key: "service.name", value: { stringValue: "auth-service" } }
    //    ] 

     if (!attrs) return null;
     
     const entry = attrs.find(a => a.key === key);

     if (!entry) return null;

    const v = entry.value;

    return v?.stringValue ?? v?.intValue ?? v?.doubleValue ?? v?.boolValue ?? null;
}

export const store = new TraceStore();