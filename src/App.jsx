import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

const fmt = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MAPA = {
  // ── MATÉRIA-PRIMA / PROD. RURAL (cfops 1101/2101) ──
  1:    { grupo: "materia_prima", label: "AQUISICAO DE PROD RURAL - FUNRURAL (1101)" },
  2:    { grupo: "materia_prima", label: "AQUISICAO DE PROD RURAL - SENAR (1101)" },
  5:    { grupo: "materia_prima", label: "COMPRA P/ INDUSTRIA - INSUMOS (1101)" },
  6:    { grupo: "materia_prima", label: "COMPRA P/ INDUSTRIA - INSUMOS (2101)" },
  1101: { grupo: "materia_prima", label: "AQUISICAO DE PROD RURAL - PJ (1101)" },

  // ── COMPRAS DE MERCADORIA ──
  1151: { grupo: "compras_merc", label: "COMPRA PARA COMERCIALIZACAO (1102)" },
  1152: { grupo: "compras_merc", label: "COMPRA P/ COMERCIALIZACAO (2102)" },
  1402: { grupo: "compras_merc", label: "COMPRA P/ COMERCIALIZACAO C/ ST (1403)" },
  9118: { grupo: "compras_merc", label: "AQUISICAO DE PRODUTOR RURAL (R-2055)" },

  // ── TRANSFERÊNCIAS ENTRADA ──
  1702: { grupo: "transf_ent", label: "TRANSFERENCIA P/ COMERCIALIZACAO (1152)" },
  1406: { grupo: "transf_ent", label: "TRANSFERENCIA P/ COMERCIAL C/ ST (1409)" },
  1605: { grupo: "transf_ent", label: "TRANSFERENCIA COMBU/LUBRIF P/ COM (1659)" },

  // ── DEVOLUÇÕES DE ENTRADA (1201/2201) ──
  1201: { grupo: "dev_ent", label: "DEVOLUCAO DE VENDA PROD ESTABELEC (1201)" },
  1202: { grupo: "dev_ent", label: "DEVOLUCAO DE VENDA PROD ESTABELEC (2201)" },
  1251: { grupo: "dev_ent", label: "DEVOLUCAO DE VENDA MERCADO ADQ 3 (1202)" },
  1408: { grupo: "dev_ent", label: "DEVOLUCAO DE VENDA MERCA 3 C/ ST (1411)" },
  1608: { grupo: "dev_ent", label: "DEVOLUCAO VDA COM/LUB P/ C. FINAL (1662)" },

  // ── BONIFICAÇÃO ──
  1917: { grupo: "bonus", label: "ENTRADA BONIFICACAO/DOACAO/BRINDE (1910)" },

  // ── ENERGIA ELÉTRICA ──
  1302: { grupo: "energia", label: "COMPRA E. ELETR POR ESTABELEC IND (1252)" },
  1303: { grupo: "energia", label: "COMPRA E. ELETR POR ESTABELEC COM (1253)" },

  // ── USO E CONSUMO GERAL ──
  1404: { grupo: "uc_geral",      label: "COMPRA MERCA P/ USO OU CONS C/ ST (1407)" },
  1506: { grupo: "uc_geral",      label: "COMPRA MERCA P/ USO OU CONSUMO (1556)" },
  1516: { grupo: "uc_geral",      label: "COMPRA MERCA P/ USO OU CONSUMO (2556)" },

  // ── USO E CONSUMO — UNIFORMES E EPI ──
  9149: { grupo: "uc_uniformes",  label: "COMPRA UNIFORMES E EPI - FABRICA (1556)" },
  9150: { grupo: "uc_uniformes",  label: "COMPRA UNIFORMES E EPI - FABRICA (2556)" },

  // ── USO E CONSUMO — MAT. LIMPEZA / DESINFECÇÃO ──
  9151: { grupo: "uc_limpeza",    label: "COMPRA MAT LIMPEZA/DESINFEC FABR (1556)" },
  9153: { grupo: "uc_limpeza",    label: "COMPRA MAT LIMPEZA/DESINFEC FABR (1407)" },

  // ── USO E CONSUMO — MANUTENÇÃO MÁQ/EQUIP/INST ──
  9154: { grupo: "uc_manut_maq",  label: "COMPRA MAN MAQ EQUIP E INST FABR (1556)" },
  9155: { grupo: "uc_manut_maq",  label: "COMPRA MAN MAQ EQUIP E INST FABR (1407)" },
  9186: { grupo: "uc_manut_maq",  label: "COMPRA MAN MAQ EQUIP E INST FABR (2556)" },

  // ── USO E CONSUMO — COPA / COZINHA / ALIMENTOS ──
  9157: { grupo: "uc_copa",       label: "COMPRA MAT COPA COZINHA ALIMENT (1556)" },
  9158: { grupo: "uc_copa",       label: "COMPRA MAT COPA COZINHA ALIMENT (1407)" },

  // ── USO E CONSUMO — MANUT. E CONSERV. VEÍCULOS ──
  9159: { grupo: "uc_veiculos",   label: "COMPRA MANUT E CONSERV VEICULOS (1556)" },
  9160: { grupo: "uc_veiculos",   label: "COMPRA MANUT E CONSERV VEICULOS (1407)" },
  9161: { grupo: "uc_veiculos",   label: "COMPRA MANUT E CONSERV VEICULOS (2556)" },

  // ── USO E CONSUMO — MAT. HIGIENE E LIMPEZA ──
  9163: { grupo: "uc_higiene",    label: "COMPRA MAT HIGIENE E LIMPEZA (1556)" },
  9164: { grupo: "uc_higiene",    label: "COMPRA MAT HIGIENE E LIMPEZA (1407)" },
  9193: { grupo: "uc_higiene",    label: "COMPRA MAT HIGIENE E LIMPEZA (2556)" },

  // ── USO E CONSUMO — MATERIAL DE ESCRITÓRIO ──
  9165: { grupo: "uc_escritorio", label: "COMPRA MATERIAL DE ESCRITÓRIO (1556)" },
  9188: { grupo: "uc_escritorio", label: "COMPRA MATERIAL DE ESCRITÓRIO (2556)" },
  9206: { grupo: "uc_escritorio", label: "COMPRA MATERIAL DE ESCRITÓRIO (2407)" },

  // ── USO E CONSUMO — EQUIP. INFORMÁTICA ──
  9167: { grupo: "uc_informatica",label: "COMPRA MAT MAN EQUIP INFORMATICA (1556)" },
  9168: { grupo: "uc_informatica",label: "COMPRA MAT MAN EQUIP INFORMATICA (1407)" },

  // ── USO E CONSUMO — MAT. ARMAZENAGEM/TRANSPORTE ──
  9194: { grupo: "uc_armazem",    label: "COMPRA MAT DE ARMAZ/TRANSPORTE (2556)" },

  // ── FRETE S/ COMPRA ──
  9140: { grupo: "frete_compra",  label: "FRETE S/ COMPRA TRANSPORTADOR SN (1352)" },
  9144: { grupo: "frete_compra",  label: "FRETE S/ COMPRA (1352)" },

  // ── FRETE S/ VENDA ──
  9141: { grupo: "frete_venda",   label: "FRETE S/ VENDA TRANSPORTADOR SN (1352)" },
  9146: { grupo: "frete_venda",   label: "FRETE S/ VENDA (1352)" },

  // ── ATIVO IMOBILIZADO ──
  9170: { grupo: "ativo_imob",    label: "COMPRA AT IMOB - CONSTRUÇÃO ANDAM (1551)" },
  9179: { grupo: "ativo_imob",    label: "COMPRA AT IMOB - CONSTRUÇÃO ANDAM (2551)" },
  9184: { grupo: "ativo_imob",    label: "COMPRA AT IMOB - CONSTRUÇÃO ANDAM (1406)" },

  // ── INDIVIDUAIS ──
  1603: { grupo: "individuais",   label: "COMPRA COMBU/LUBR P/ CONSUM FINAL (1653)" },
  1336: { grupo: "individuais",   label: "AQUIS SERV COMUNICACAO P/ EST COM (1303)" },
  1933: { grupo: "individuais",   label: "OUTRA ENTRADA MERCAD/PREST SERVIC (1949)" },
  1938: { grupo: "individuais",   label: "CONTABILIDADE, INCLUSIVE SERVICOS" },
  9119: { grupo: "individuais",   label: "TICKET REFEICAO" },
  9120: { grupo: "individuais",   label: "VIGILANCIA, SEGURANCA OU MONITORAMENTO" },
  1369: { grupo: "individuais",   label: "AQUIS SERV TRANSPORTE P/ ESTAB COM (1353)" },
  2110: { grupo: "individuais",   label: "HOSPITAIS, CLINICAS E LABORATORIOS" },
  1810: { grupo: "individuais",   label: "RETORNO MERC/BEM REM P/ CONSERTO (1916)" },
  1926: { grupo: "individuais",   label: "ENTRADA MERC RECEBIDA VDA À ORDEM (1923)" },
  1934: { grupo: "individuais",   label: "LUBRIFICAÇÃO, LIMPEZA, LUSTRAÇÃO (14.01)" },
  1943: { grupo: "individuais",   label: "LICENCIAMENTO OU CESSÃO C/ RETEN (01.05)" },
  1946: { grupo: "individuais",   label: "INSTRUÇÃO, TREINAMENTO, ORIENTAÇÃO (08.02)" },
  1951: { grupo: "individuais",   label: "DATILOGRAFIA, DIGITAÇÃO, ESTENOGRAFIA (17.02)" },
  1953: { grupo: "individuais",   label: "PROPAGANDA E PUBLICIDADE (17.06)" },
  1962: { grupo: "individuais",   label: "CARPINTARIA E SERRALHERIA (14.13)" },
  1979: { grupo: "individuais",   label: "RECAUCHUTAGEM OU REGENERAÇÃO DE PN (14.04)" },
  1984: { grupo: "individuais",   label: "AGENCIAMENTO, CORRETAGEM (10.02)" },
  1985: { grupo: "individuais",   label: "VARRIÇÃO, COLETA, REMOÇÃO (07.09)" },
  1988: { grupo: "individuais",   label: "ADVOCACIA (17.14)" },
  1989: { grupo: "individuais",   label: "PROCESSAMENTO DE DADOS E ANALISES (17.01)" },
  1996: { grupo: "individuais",   label: "EXECUÇÃO, POR ADMINISTRAÇÃO (07.02)" },
  2003: { grupo: "individuais",   label: "ENGENHARIA, ARQUITETURA (07.01)" },
  2010: { grupo: "individuais",   label: "REPRESENTAÇÃO DE QUALQUER NATUREZA (10.09)" },
  2107: { grupo: "individuais",   label: "TRANSPORTE RODOVIÁRIO DE CARGAS (16.02)" },
  2118: { grupo: "individuais",   label: "INSTALAÇÃO E MONTAGEM DE APARELHOS (14.06)" },
  6561: { grupo: "individuais",   label: "ASSESSORIA E CONSULTORIA EM INFORM (01.06)" },
  9127: { grupo: "individuais",   label: "HONORARIOS ADVOCATICIOS" },
  9183: { grupo: "individuais",   label: "VIGILANCIA, SEGURANÇA OU MONITORAMENTO (11.02)" },
  9200: { grupo: "individuais",   label: "COMPOSIÇÃO GRÁFICA, IMPRESSÃO (13.05.01)" },
  9201: { grupo: "individuais",   label: "SUPORTE TÉC. INFORMÁTICA (01.07.01)" },
  9202: { grupo: "individuais",   label: "MONITORAMENTO E RASTREAMENTO (11.05.01)" },
  9203: { grupo: "individuais",   label: "AGENC./CORRET. DIREITOS (10.03.01)" },
  9204: { grupo: "individuais",   label: "OUTROS PLANOS DE SAUDE (04.23.01)" },
  9205: { grupo: "individuais",   label: "ADMINISTRAÇÃO GERAL DE BENS (17.12.01)" },

  // ── VENDAS (saídas) ──
  9113: { grupo: "vendas",        label: "VENDAS SEM ST - REDUCOES Z (9113)" },
  9114: { grupo: "vendas",        label: "VENDAS COM ST ICMS - REDUCOES Z (9114)" },
  5101: { grupo: "vendas",        label: "VENDA DE PRODUCAO DO ESTABELECIMENTO (5101)" },
  5102: { grupo: "vendas",        label: "VENDA PRODUCAO DO ESTABELECIMENTO (6101)" },
  5151: { grupo: "vendas",        label: "VENDA MERCADORIA ADQ OU RECEBI 3 (5102)" },
  5404: { grupo: "vendas",        label: "VDA MERC ADQ 3 C/ ST SUBSTITUIDO (5405)" },
  5606: { grupo: "vendas",        label: "VENDA COMBUST/LUBRIF CONSUM FINAL (5656)" },

  // ── TRANSFERÊNCIAS SAÍDA ──
  5702: { grupo: "transf_sai",    label: "TRANSFERENCIA MERC ADQ OU RECE 3 (5152)" },
  5406: { grupo: "transf_sai",    label: "TRANSFERENCIA MERCADORIA C/ ST (5409)" },
  5609: { grupo: "transf_sai",    label: "TRANSFERENCIA COMBU/LUBRIF ADQ 3 (5659)" },

  // ── DEVOLUÇÕES SAÍDA ──
  5251: { grupo: "dev_sai",       label: "DEVOLUCAO COMPRA P/ COMERCIALIZAC (5202)" },
  5252: { grupo: "dev_sai",       label: "DEVOLUCAO COMPRA P/ COMERCIALIZAC (6202)" },
  5408: { grupo: "dev_sai",       label: "DEVOLUCAO COMP P/ COMERCIAL C/ ST (5411)" },
};

// ── GRUPOS CONFIG ─────────────────────────────────────────────
// "pai" marca grupos que são apenas cabeçalho de seção (não têm itens diretos)
const GRUPOS_CONFIG = {
  materia_prima:  { label: "Matéria-Prima / Prod. Rural",        color: "#92400e", bg: "#fffbeb", border: "#fcd34d", secao: "entradas" },
  compras_merc:   { label: "Compras de Mercadoria",              color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", secao: "entradas" },
  transf_ent:     { label: "Transferências de Entrada",          color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", secao: "entradas" },
  dev_ent:        { label: "Devoluções de Entrada (1201/2201)",  color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", secao: "entradas" },
  bonus:          { label: "Bonificação",                        color: "#6d28d9", bg: "#faf5ff", border: "#ddd6fe", secao: "entradas" },
  energia:        { label: "Energia Elétrica",                   color: "#b45309", bg: "#fffbeb", border: "#fde68a", secao: "entradas" },

  // ── bloco uso e consumo ──
  uc_geral:       { label: "↳  Uso e Consumo Geral",             color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_uniformes:   { label: "↳  Uniformes e EPI",                 color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_limpeza:     { label: "↳  Mat. Limpeza / Desinfecção",      color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_manut_maq:   { label: "↳  Manut. Máq. / Equip. / Inst.",   color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_copa:        { label: "↳  Copa / Cozinha / Alimentos",      color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_veiculos:    { label: "↳  Manut. e Conserv. Veículos",      color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_higiene:     { label: "↳  Mat. Higiene e Limpeza",          color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_escritorio:  { label: "↳  Material de Escritório",          color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_informatica: { label: "↳  Equip. / Mat. Informática",       color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },
  uc_armazem:     { label: "↳  Mat. Armazenagem / Transporte",   color: "#065f46", bg: "#f0fdf4", border: "#86efac", secao: "entradas", pai: "uso_consumo" },

  frete_compra:   { label: "Frete s/ Compra",                    color: "#0e7490", bg: "#ecfeff", border: "#a5f3fc", secao: "entradas" },
  frete_venda:    { label: "Frete s/ Venda",                     color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd", secao: "entradas" },
  ativo_imob:     { label: "Ativo Imobilizado",                  color: "#1f2937", bg: "#f9fafb", border: "#d1d5db", secao: "entradas" },
  individuais:    { label: "Itens Individuais",                   color: "#475569", bg: "#f8fafc", border: "#cbd5e1", secao: "entradas" },

  vendas:         { label: "Vendas (5101 / 6101)",               color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", secao: "saidas" },
  transf_sai:     { label: "Transferências de Saída",            color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", secao: "saidas" },
  dev_sai:        { label: "Devoluções de Saída",                color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", secao: "saidas" },
};

const UC_FILHOS = ["uc_geral","uc_uniformes","uc_limpeza","uc_manut_maq","uc_copa","uc_veiculos","uc_higiene","uc_escritorio","uc_informatica","uc_armazem"];

const ORDEM_ENTRADAS = [
  "materia_prima","compras_merc","transf_ent","dev_ent","bonus","energia",
  // uso e consumo agrupado
  ...UC_FILHOS,
  "frete_compra","frete_venda","ativo_imob","individuais",
];
const ORDEM_SAIDAS = ["vendas","transf_sai","dev_sai"];

// ─────────────────────────────────────────────────────────────
function parseSheet(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  let empresa = "", cnpj = "", periodo = "";
  for (const row of rows) {
    const r = row.map(c => (c != null ? String(c) : ""));
    const joined = r.join(" ");
    if (!empresa) {
      const c0 = r[0] ? r[0].trim() : "";
      if (c0.length > 8 && !c0.match(/^[\d\.\/\-]/)) empresa = c0;
    }
    if (!cnpj) {
      const m = joined.match(/\d{2}\.?\d{3}\.?\d{3}[\/\\]?\d{4}[-\.]?\d{2}/);
      if (m) cnpj = m[0];
    }
    if (!periodo && (joined.includes("Período") || joined.includes("Periodo") || joined.includes("riodo"))) {
      const dates = joined.match(/\d{4}-\d{2}-\d{2}/g);
      if (dates && dates.length >= 2) {
        const fmtDate = (d) => { const [y, m] = d.split("-"); return `${String(m).padStart(2,"0")}/${y}`; };
        periodo = `${fmtDate(dates[0])} a ${fmtDate(dates[1])}`;
      } else {
        const nums = joined.match(/\b\d{5}\b/g);
        if (nums && nums.length >= 2) {
          const excelToDate = (serial) => {
            const d = new Date((serial - 25569) * 86400 * 1000);
            return `${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
          };
          periodo = `${excelToDate(parseInt(nums[0]))} a ${excelToDate(parseInt(nums[nums.length-1]))}`;
        }
      }
    }
  }
  const grupos = {};
  for (const row of rows) {
    const raw0 = row[0];
    if (raw0 == null) continue;
    const acum = parseInt(String(raw0), 10);
    if (isNaN(acum)) continue;
    const raw9 = row[9];
    let valor = 0;
    if (raw9 != null) valor = typeof raw9 === "number" ? raw9 : parseFloat(String(raw9).replace(",", "."));
    if (isNaN(valor) || valor === 0) continue;
    const cfg = MAPA[acum];
    if (!cfg) continue;
    if (!grupos[cfg.grupo]) grupos[cfg.grupo] = [];
    grupos[cfg.grupo].push({ acum, desc: cfg.label, valor });
  }
  return { empresa, cnpj, periodo, grupos };
}

// ─────────────────────────────────────────────────────────────
function SectionCard({ gid, items, defaultOpen, indent = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg   = GRUPOS_CONFIG[gid];
  const total = items.reduce((s, i) => s + i.valor, 0);

  return (
    <div style={{
      border: `1.5px solid ${cfg.border}`,
      borderRadius: 10,
      marginBottom: 8,
      marginLeft: indent ? 20 : 0,
      background: cfg.bg,
      overflow: "hidden",
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: cfg.color }}>{open ? "▾" : "▸"}</span>
          <span style={{ fontWeight: 700, color: cfg.color, fontSize: indent ? 13 : 14 }}>{cfg.label}</span>
        </div>
        <span style={{ fontWeight: 800, color: cfg.color, fontSize: 14 }}>{fmt(total)}</span>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${cfg.border}`, padding: "8px 14px 12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.04)" }}>
                <th style={{ padding: "5px 8px", textAlign: "left",  fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Acum.</th>
                <th style={{ padding: "5px 8px", textAlign: "left",  fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Descrição</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Vlr Contábil</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, ii) => (
                <tr key={ii} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <td style={{ padding: "6px 8px", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{item.acum}</td>
                  <td style={{ padding: "6px 8px", fontSize: 13, color: "#1e293b" }}>{item.desc}</td>
                  <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: 600, color: "#1e293b", textAlign: "right" }}>{fmt(item.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${cfg.border}`, background: "rgba(0,0,0,0.03)" }}>
                <td colSpan={2} style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: cfg.color }}>Subtotal</td>
                <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: 800, color: cfg.color, textAlign: "right" }}>
                  {fmt(items.reduce((s, i) => s + i.valor, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Bloco especial: Uso e Consumo com sub-grupos ─────────────
function UsoConsumoBlock({ grupos }) {
  const [open, setOpen] = useState(true);
  const filhosPresentes = UC_FILHOS.filter(gid => (grupos[gid] || []).length > 0);
  if (filhosPresentes.length === 0) return null;
  const total = filhosPresentes.reduce((s, gid) => s + (grupos[gid] || []).reduce((a, i) => a + i.valor, 0), 0);

  return (
    <div style={{
      border: "1.5px solid #6ee7b7",
      borderRadius: 12,
      marginBottom: 10,
      background: "#ecfdf5",
      overflow: "hidden",
    }}>
      {/* cabeçalho pai */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, color: "#065f46" }}>{open ? "▾" : "▸"}</span>
          <span style={{ fontWeight: 700, color: "#065f46", fontSize: 14 }}>Uso e Consumo (1407 / 1556 / 2556)</span>
          <span style={{
            fontSize: 10, fontWeight: 700, background: "#065f46", color: "#fff",
            borderRadius: 4, padding: "1px 7px", letterSpacing: "0.05em"
          }}>{filhosPresentes.length} categorias</span>
        </div>
        <span style={{ fontWeight: 900, color: "#065f46", fontSize: 15 }}>{fmt(total)}</span>
      </div>

      {/* filhos */}
      {open && (
        <div style={{ padding: "6px 14px 14px" }}>
          {filhosPresentes.map(gid => (
            <SectionCard key={gid} gid={gid} items={grupos[gid]} defaultOpen={false} indent={true} />
          ))}
          {/* total consolidado */}
          <div style={{
            marginTop: 6, marginLeft: 20,
            background: "#065f4612", border: "1.5px solid #6ee7b7",
            borderRadius: 8, padding: "8px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>TOTAL USO E CONSUMO</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#065f46" }}>{fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UploadScreen ─────────────────────────────────────────────
function UploadScreen({ onData }) {
  const [drag, setDrag] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const processar = (file) => {
    setErro("");
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xls","xlsx"].includes(ext)) { setErro("Envie um arquivo .xls ou .xlsx"); return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array" });
        const data = parseSheet(wb);
        const total = Object.values(data.grupos).reduce((s, arr) => s + arr.length, 0);
        if (total === 0) { setErro("Nenhum acumulador reconhecido. Verifique o arquivo."); setLoading(false); return; }
        onData(data, file.name);
      } catch (err) {
        setErro("Erro ao ler a planilha: " + err.message);
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    processar(e.dataTransfer.files[0]);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 20%, hsl(215 60% 7%) 0%, hsl(210 50% 4%) 60%, hsl(210 30% 2%) 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dots { 0%,20%{content:"."} 40%{content:".."} 60%,100%{content:"..."} }
        .upload-title{animation:fadeUp .8s cubic-bezier(.5,1,.89,1) both}
        .upload-sub{animation:fadeUp .8s .15s cubic-bezier(.5,1,.89,1) both}
        .upload-drop{animation:fadeUp .8s .3s cubic-bezier(.5,1,.89,1) both}
        .neon-ring{position:absolute;inset:-1.5px;border-radius:22px;padding:1.5px;
          background:conic-gradient(from 0deg,transparent 0%,transparent 20%,hsl(210 80% 45%/.3) 23%,hsl(205 90% 70%) 26%,hsl(200 100% 85%) 28%,hsl(205 90% 70%) 30%,hsl(210 80% 45%/.3) 33%,transparent 36%,transparent 70%,hsl(210 80% 45%/.3) 73%,hsl(205 90% 70%) 76%,hsl(200 100% 85%) 78%,hsl(205 90% 70%) 80%,hsl(210 80% 45%/.3) 83%,transparent 86%,transparent 100%);
          -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
        .drop-inner{position:relative;border-radius:20px;background:linear-gradient(135deg,hsl(210 50% 9%/.9),hsl(210 40% 6%/.95));backdrop-filter:blur(16px);padding:52px 40px;cursor:pointer;transition:all .3s cubic-bezier(.5,1,.89,1);border:1px solid hsl(210 40% 20%/.4);overflow:hidden}
        .drop-inner:hover,.drop-inner.drag{background:linear-gradient(135deg,hsl(210 50% 12%/.92),hsl(210 40% 9%/.97));border-color:hsl(205 80% 50%/.35)}
        .drop-text{color:hsl(210 30% 78%);font-size:15px;font-weight:600;letter-spacing:.01em}
        .drop-text.active{color:hsl(200 80% 70%)}
        .drop-hint{color:hsl(210 20% 42%);font-size:12px;margin-top:8px;letter-spacing:.05em}
        .loading-text::after{content:"...";animation:dots 1.2s steps(3,end) infinite}
      `}</style>

      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div className="upload-title" style={{ marginBottom: 40 }}>
          <img src="https://escmodelo.com.br/wp-content/uploads/2023/06/Logo-Modelo-Sem-fundo.png"
            alt="Modelo Serviços Contábeis"
            style={{ maxWidth: 220, width: "100%", height: "auto", display: "block", margin: "0 auto 20px" }} />
          <div style={{ fontSize: 11, letterSpacing: "0.3em", fontWeight: 700, textTransform: "uppercase", marginBottom: 10, color: "rgb(56,189,248)" }}>
            Análise Contábil
          </div>
          <h1 style={{ margin: 0, lineHeight: 1.15, fontWeight: 900, fontSize: 32, color: "#e8eef4" }}>
            Resumo por Acumulador
          </h1>
        </div>

        <div className="upload-drop" style={{ position: "relative", marginBottom: 20 }}>
          <div className="neon-ring" />
          <div className={`drop-inner${drag?" drag":""}`}
            onDragOver={(e)=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}
            onClick={()=>!loading&&inputRef.current.click()}>
            {loading ? (
              <>
                <svg style={{width:44,height:44,display:"block",margin:"0 auto 18px"}} viewBox="0 0 24 24" fill="none" stroke="hsl(205 80% 65%)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <div className="drop-text active"><span className="loading-text">Processando planilha</span></div>
                <div className="drop-hint">aguarde um momento</div>
              </>
            ) : (
              <>
                {drag ? (
                  <svg style={{width:44,height:44,display:"block",margin:"0 auto 18px"}} viewBox="0 0 24 24" fill="none" stroke="hsl(205 80% 70%)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                ) : (
                  <svg style={{width:44,height:44,display:"block",margin:"0 auto 18px"}} viewBox="0 0 24 24" fill="none" stroke="hsl(205 60% 58%)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                )}
                <div className={`drop-text${drag?" active":""}`}>{drag?"Solte o arquivo aqui":"Arraste o arquivo ou clique para selecionar"}</div>
                <div className="drop-hint">.xls &nbsp;·&nbsp; .xlsx</div>
              </>
            )}
          </div>
        </div>

        <input ref={inputRef} type="file" accept=".xls,.xlsx" style={{display:"none"}}
          onChange={(e)=>processar(e.target.files[0])} />

        <div className="upload-sub" style={{color:"hsl(205deg 68% 95%/.48)",fontSize:13,marginTop:8,lineHeight:1.6}}>
          Planilha <strong style={{color:"hsl(205deg 68% 95%/.48)"}}>Resumo por Acumulador</strong> exportada do sistema fiscal
        </div>

        {erro && (
          <div style={{marginTop:20,borderRadius:10,padding:"12px 16px",fontSize:13,background:"hsl(0 50% 8%/.8)",border:"1px solid hsl(0 60% 30%/.6)",color:"#fca5a5",backdropFilter:"blur(8px)"}}>
            ⚠️ {erro}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({ data, fileName, onReset }) {
  const { empresa, cnpj, periodo, grupos } = data;
  const somaGrupo = (gid) => (grupos[gid] || []).reduce((s, i) => s + i.valor, 0);
  const somaUC    = () => UC_FILHOS.reduce((s, gid) => s + somaGrupo(gid), 0);
  const totalEnt  = [
    "materia_prima","compras_merc","transf_ent","dev_ent","bonus","energia",
    ...UC_FILHOS,
    "frete_compra","frete_venda","ativo_imob","individuais",
  ].reduce((s, gid) => s + somaGrupo(gid), 0);
  const totalSai  = ORDEM_SAIDAS.reduce((s, gid) => s + somaGrupo(gid), 0);
  const diff      = totalEnt - totalSai;

  const kpis = [
    { label: "Total Entradas",              value: totalEnt,                                                                   color: "#1d4ed8", bg: "#eff6ff" },
    { label: "Compras + Transf + Bonif",    value: somaGrupo("compras_merc")+somaGrupo("transf_ent")+somaGrupo("bonus"),      color: "#6d28d9", bg: "#faf5ff" },
    { label: "Matéria-Prima / Prod. Rural", value: somaGrupo("materia_prima"),                                                color: "#92400e", bg: "#fffbeb" },
    { label: "Total Vendas",                value: somaGrupo("vendas"),                                                       color: "#b91c1c", bg: "#fef2f2" },
    { label: "Total Saídas",                value: totalSai,                                                                  color: "#0f172a", bg: "#f8fafc" },
  ];

  // entradas sem os UC_FILHOS (renderizados dentro do bloco especial)
  const ENTRADAS_ANTES_UC = ["materia_prima","compras_merc","transf_ent","dev_ent","bonus","energia"];
  const ENTRADAS_APOS_UC  = ["frete_compra","frete_venda","ativo_imob","individuais"];

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f1f5f9",minHeight:"100vh",padding:"24px 16px"}}>
      <div style={{maxWidth:920,margin:"0 auto"}}>

        {/* header */}
        <div style={{background:"#0f172a",borderRadius:12,padding:"18px 24px",marginBottom:18,color:"#fff",
                     display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Resumo por Acumulador</div>
            <div style={{fontSize:18,fontWeight:800}}>{empresa||fileName}</div>
            {(cnpj||periodo)&&(
              <div style={{fontSize:12,color:"#64748b",marginTop:3}}>
                {cnpj&&`CNPJ ${cnpj}`}{cnpj&&periodo&&" · "}{periodo&&`Período: ${periodo}`}
              </div>
            )}
          </div>
          <button onClick={onReset}
            style={{background:"rgba(255,255,255,.08)",border:"1px solid #334155",borderRadius:8,color:"#94a3b8",fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
            Nova planilha
          </button>
        </div>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
          {kpis.map((k,i)=>(
            <div key={i} style={{background:k.bg,border:`1.5px solid ${k.color}22`,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",fontWeight:700,letterSpacing:"0.05em",marginBottom:5,lineHeight:1.4}}>{k.label}</div>
              <div style={{fontSize:15,fontWeight:900,color:k.color}}>{fmt(k.value)}</div>
            </div>
          ))}
        </div>

        {/* ENTRADAS */}
        <div style={{marginBottom:22}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{background:"#1d4ed8",color:"#fff",borderRadius:6,padding:"3px 12px",fontSize:12,fontWeight:700}}>ENTRADAS</span>
            <span style={{fontWeight:800,color:"#1d4ed8",fontSize:15}}>{fmt(totalEnt)}</span>
          </div>

          {ENTRADAS_ANTES_UC.filter(gid=>(grupos[gid]||[]).length>0).map(gid=>(
            <SectionCard key={gid} gid={gid} items={grupos[gid]} defaultOpen={gid==="materia_prima"} />
          ))}

          {/* bloco uso e consumo */}
          <UsoConsumoBlock grupos={grupos} />

          {ENTRADAS_APOS_UC.filter(gid=>(grupos[gid]||[]).length>0).map(gid=>(
            <SectionCard key={gid} gid={gid} items={grupos[gid]} defaultOpen={false} />
          ))}
        </div>

        {/* SAÍDAS */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{background:"#b91c1c",color:"#fff",borderRadius:6,padding:"3px 12px",fontSize:12,fontWeight:700}}>SAÍDAS</span>
            <span style={{fontWeight:800,color:"#b91c1c",fontSize:15}}>{fmt(totalSai)}</span>
          </div>
          {ORDEM_SAIDAS.filter(gid=>(grupos[gid]||[]).length>0).map(gid=>(
            <SectionCard key={gid} gid={gid} items={grupos[gid]} defaultOpen={gid==="vendas"} />
          ))}
        </div>

        {/* diferença */}
        <div style={{marginTop:18,background:"#0f172a",borderRadius:10,padding:"14px 20px",
                     display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>DIFERENÇA (ENTRADAS − SAÍDAS)</span>
          <span style={{color:diff>=0?"#4ade80":"#f87171",fontSize:18,fontWeight:900}}>{fmt(diff)}</span>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [result,   setResult]   = useState(null);
  const [fileName, setFileName] = useState("");
  if (result) return <Dashboard data={result} fileName={fileName} onReset={()=>{setResult(null);setFileName("");}} />;
  return <UploadScreen onData={(data,name)=>{setResult(data);setFileName(name);}} />;
}
