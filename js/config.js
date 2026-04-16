// ============================================================
// config.js — Variáveis globais e configurações
// Carregado PRIMEIRO pelos outros arquivos JS
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbxvVUy78wqgglMPrVGrx_O5WbJgGy8ESggZAqvZzhQaGcVMQ5IE4Bxm5cThSsgmCvQ/exec";

// Dados globais (preenchidos pelo loadData via API)
let DATA          = null;
let ESTOQUE_DATA  = [];
let KPIS_ESTOQUE  = {};
let RUPTURAS_DATA = [];
let INSIGHTS_DATA = { alta: [], queda: [], parado: [], oportunidade: [] };
let PROJ_DATA     = [];
