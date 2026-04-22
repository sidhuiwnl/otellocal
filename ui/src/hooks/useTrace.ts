import { useState,useEffect,useCallback } from "react";

const WS_URL = 'ws://localhost:4320'
const API_URL = 'http://localhost:4320/api'


type Trace ={
    
  traceId: string;
  rootName: string;
  service: string;
  startMs : number;
  durationMs: number;
  startTime: number;
  [key : string] : any;

}


export function useTraces(){
    const [traces,setTraces] = useState<Trace[]>([]);
    const [selectedTrace,setSelectedTrace] = useState<Trace  | null>(null);
    const [connected,setConnected] = useState(false);
    const [filter, setFilter]           = useState('')

    useEffect(() => {
        let ws : WebSocket;
        let reconnectTimer : ReturnType<typeof setTimeout>;

        function connect(){
            ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                 setConnected(true)
                 console.log('[ws] connected')
            }

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);

                if(msg.type === "snapshot"){
                    setTraces(msg.traces)
                }

                if(msg.type === 'trace:update'){
                    setTraces(prev => {
                        const idx = prev.findIndex(t => t.traceId === msg.trace.traceId)
                        if(idx !== -1){ // this means to Returns:index (0,1,2...) if found -1 if NOT found
                            const next = [...prev];
                            next[idx] = msg.trace
                            return next
                        }

                        return [msg.trace,...prev]
                        
                    })
                }

                if(msg.type === "store:clear"){
                     setTraces([])
                     setSelectedTrace(null)
                }
            }

            ws.onclose = () => {
                setConnected(false);
                console.log('[ws] disconnected — retrying in 2s')
                reconnectTimer = setTimeout(connect, 2000)
            }

            ws.onerror = () => ws.close()
        }

        connect()

        return () => {
            clearTimeout(reconnectTimer);
            ws?.close()
        }
    },[])
    

    const selectTrace = useCallback(async (traceId : string) => {

        setSelectedTrace(prev => prev?.traceId === traceId ? prev : {traceId, spans : []})

        const res = await fetch(`${API_URL}/trace/${traceId}`);
        const data = await res.json();

        setSelectedTrace(data)
    },[])

    const clearTraces = useCallback(async() =>{
        await fetch(`${API_URL}/traces`, { method: 'DELETE' })
    },[])

    const filteredTraces = filter
    ? traces.filter(t =>
        t.rootName.toLowerCase().includes(filter.toLowerCase()) ||
        t.service.toLowerCase().includes(filter.toLowerCase()) ||
        t.traceId.includes(filter)
      )
    : traces

    return {
    traces: filteredTraces,
    selectedTrace,
    connected,
    filter,
    setFilter,
    selectTrace,
    clearTraces,
  }
}