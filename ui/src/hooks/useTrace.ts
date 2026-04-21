import { useState,useEffect,useCallback } from "react";

const WS_URL = 'ws://localhost:4320'
const API_URL = 'http://localhost:4320/api'

export function useTrace(){
    const [traces,setTraces] = useState([]);
    
}