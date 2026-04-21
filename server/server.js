import http from 'http';
import express from 'express';
import cors from 'cors';
import { createHttpReceiver } from './http-receiver.js';
import { attachWsServer } from './ws-server.js';
import { createApiRouter } from './api.js';
import { store } from './store.js';



const OTLP_HTTP_PORT = process.env.OTLP_HTTP_PORT ?? 4318;
const API_PORT       = process.env.API_PORT       ?? 4320;
const DEMO_MODE      = process.argv.includes('--demo');

