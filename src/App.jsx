import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

const fmt = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ─── mapeamento acumulador → grupo ─────────────────────────── */
const MAPA = {
  1101: { grupo: "materia_prima",  label: "COMPRA P/ INDUSTRIA OU PROD RURAL" },
  1401: { grupo: "materia_prima",  label: "COMPRA P/ IND OU PROD RURAL C/ ST" },
  1151: { grupo: "compras_merc",   label: "COMPRA PARA COMERCIALIZACAO (1102)" },
  1152: { grupo: "compras_merc",   label: "COMPRA P/ COMERCIALIZACAO (2102)" },
  1402: { grupo: "compras_merc",   label: "COMPRA P/ COMERCIALIZACAO C/ ST (1403)" },
  9118: { grupo: "compras_merc",   label: "AQUISICAO DE PRODUTOR RURAL (R-2055)" },
  1702: { grupo: "transf_ent",     label: "TRANSFERENCIA P/ COMERCIALIZACAO (1152)" },
  1406: { grupo: "transf_ent",     label: "TRANSFERENCIA P/ COMERCIAL C/ ST (1409)" },
  1605: { grupo: "transf_ent",     label: "TRANSFERENCIA COMBU/LUBRIF P/ COM (1659)" },
  1251: { grupo: "dev_ent",        label: "DEVOLUCAO DE VENDA MERCADO ADQ 3 (1202)" },
  1408: { grupo: "dev_ent",        label: "DEVOLUCAO DE VENDA MERCA 3 C/ ST (1411)" },
  1608: { grupo: "dev_ent",        label: "DEVOLUCAO VDA COM/LUB P/ C. FINAL (1662)" },
  1917: { grupo: "bonus",          label: "ENTRADA BONIFICACAO/DOACAO/BRINDE (1910)" },
  1302: { grupo: "energia",        label: "COMPRA E. ELETR POR ESTABELEC IND (1252)" },
  1303: { grupo: "energia",        label: "COMPRA E. ELETR POR ESTABELEC COM (1253)" },
  1404: { grupo: "uso_consumo",    label: "COMPRA MERCA P/ USO OU CONS C/ ST (1407)" },
  1506: { grupo: "uso_consumo",    label: "COMPRA MERCA P/ USO OU CONSUMO (1556)" },
  1603: { grupo: "individuais",    label: "COMPRA COMBU/LUBR P/ CONSUM FINAL (1653)" },
  1336: { grupo: "individuais",    label: "AQUIS SERV COMUNICACAO P/ EST COM (1303)" },
  1933: { grupo: "individuais",    label: "OUTRA ENTRADA MERCAD/PREST SERVIC (1949)" },
  1938: { grupo: "individuais",    label: "CONTABILIDADE, INCLUSIVE SERVICOS" },
  9119: { grupo: "individuais",    label: "TICKET REFEICAO" },
  9113: { grupo: "vendas",         label: "VENDAS SEM ST - REDUCOES Z (9113)" },
  9114: { grupo: "vendas",         label: "VENDAS COM ST ICMS - REDUCOES Z (9114)" },
  5151: { grupo: "vendas",         label: "VENDA MERCADORIA ADQ OU RECEBI 3 (5102)" },
  5404: { grupo: "vendas",         label: "VDA MERC ADQ 3 C/ ST SUBSTITUIDO (5405)" },
  5606: { grupo: "vendas",         label: "VENDA COMBUST/LUBRIF CONSUM FINAL (5656)" },
  5702: { grupo: "transf_sai",     label: "TRANSFERENCIA MERC ADQ OU RECE 3 (5152)" },
  5406: { grupo: "transf_sai",     label: "TRANSFERENCIA MERCADORIA C/ ST (5409)" },
  5251: { grupo: "dev_sai",        label: "DEVOLUCAO COMPRA P/ COMERCIALIZAC (5202)" },
  5252: { grupo: "dev_sai",        label: "DEVOLUCAO COMPRA P/ COMERCIALIZAC (6202)" },
  5408: { grupo: "dev_sai",        label: "DEVOLUCAO COMP P/ COMERCIAL C/ ST (5411)" },
};

const GRUPOS_CONFIG = {
  materia_prima: { label: "Materia-Prima / Prod. Rural",    color: "#92400e", bg: "#fffbeb", border: "#fcd34d", secao: "entradas" },
  compras_merc:  { label: "Compras de Mercadoria",          color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", secao: "entradas" },
  transf_ent:    { label: "Transferencias de Entrada",      color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", secao: "entradas" },
  dev_ent:       { label: "Devolucoes de Entrada",          color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", secao: "entradas" },
  bonus:         { label: "Bonificacao",                    color: "#6d28d9", bg: "#faf5ff", border: "#ddd6fe", secao: "entradas" },
  energia:       { label: "Energia Eletrica",               color: "#b45309", bg: "#fffbeb", border: "#fde68a", secao: "entradas" },
  uso_consumo:   { label: "Uso e Consumo",                  color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0", secao: "entradas" },
  individuais:   { label: "Itens Individuais",              color: "#475569", bg: "#f8fafc", border: "#cbd5e1", secao: "entradas" },
  vendas:        { label: "Vendas",                         color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", secao: "saidas"   },
  transf_sai:    { label: "Transferencias de Saida",        color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", secao: "saidas"   },
  dev_sai:       { label: "Devolucoes de Saida",            color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", secao: "saidas"   },
};

const ORDEM_ENTRADAS = ["materia_prima","compras_merc","transf_ent","dev_ent","bonus","energia","uso_consumo","individuais"];
const ORDEM_SAIDAS   = ["vendas","transf_sai","dev_sai"];

/* ─── parser ──────────────────────────────────────────────────── */
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
        const fmtDate = (d) => {
          const [y, m] = d.split("-");
          return `${String(m).padStart(2,"0")}/${y}`;
        };
        periodo = `${fmtDate(dates[0])} a ${fmtDate(dates[1])}`;
      }
    }
  }

  const grupos = {};

  for (const row of rows) {
    const raw0 = row[0];
    const raw9 = row[9];

    const acum  = parseInt(String(raw0 ?? ""), 10);
    if (isNaN(acum)) continue;

    let valor = 0;
    if (raw9 != null) {
      if (typeof raw9 === "number") valor = raw9;
      else valor = parseFloat(String(raw9).replace(",", "."));
    }
    if (isNaN(valor) || valor === 0) continue;

    const cfg = MAPA[acum];
    if (!cfg) continue;

    if (!grupos[cfg.grupo]) grupos[cfg.grupo] = [];
    grupos[cfg.grupo].push({ acum, desc: cfg.label, valor });
  }

  return { empresa, cnpj, periodo, grupos };
}

/* ─── SectionCard ─────────────────────────────────────────────── */
function SectionCard({ gid, items, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg   = GRUPOS_CONFIG[gid];
  const total = items.reduce((s, i) => s + i.valor, 0);

  return (
    <div style={{ border: `1.5px solid ${cfg.border}`, borderRadius: 10, marginBottom: 10, background: cfg.bg, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, color: cfg.color }}>{open ? "▾" : "▸"}</span>
          <span style={{ fontWeight: 700, color: cfg.color, fontSize: 14 }}>{cfg.label}</span>
        </div>
        <span style={{ fontWeight: 800, color: cfg.color, fontSize: 15 }}>{fmt(total)}</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${cfg.border}`, padding: "8px 14px 12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.04)" }}>
                <th style={{ padding: "5px 8px", textAlign: "left",  fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Acum.</th>
                <th style={{ padding: "5px 8px", textAlign: "left",  fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Descricao</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Vlr Contabil</th>
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

/* ─── UploadScreen ────────────────────────────────────────────── */
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
        if (total === 0) { setErro("Nenhum acumulador reconhecido. Verifique se o arquivo e o correto."); setLoading(false); return; }
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
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.2em", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", marginBottom: 14 }}>
            Analise Contabil
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: 34, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
            Resumo por<br />Acumulador
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 14, lineHeight: 1.6 }}>
            Envie a planilha <strong style={{ color: "#94a3b8" }}>Empresa_XXXX_-_SUPERMERCADO.xls</strong><br />
            para gerar o dashboard automaticamente
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !loading && inputRef.current.click()}
          style={{
            border: `2px dashed ${drag ? "#38bdf8" : "#334155"}`,
            borderRadius: 16, padding: "52px 32px", cursor: loading ? "default" : "pointer",
            background: drag ? "rgba(56,189,248,0.07)" : "rgba(255,255,255,0.02)",
            transition: "all .2s",
          }}
        >
          {loading ? (
            <>
              <div style={{ fontSize: 44, marginBottom: 14, animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</div>
              <div style={{ color: "#38bdf8", fontSize: 15, fontWeight: 600 }}>Processando planilha...</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ color: drag ? "#38bdf8" : "#94a3b8", fontSize: 15, fontWeight: 600 }}>
                {drag ? "Solte o arquivo aqui" : "Arraste o arquivo ou clique para selecionar"}
              </div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>.xls &nbsp;·&nbsp; .xlsx</div>
            </>
          )}
        </div>

        <input ref={inputRef} type="file" accept=".xls,.xlsx" style={{ display: "none" }}
          onChange={(e) => processar(e.target.files[0])} />

        {erro && (
          <div style={{ marginTop: 16, background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8,
                        padding: "10px 16px", color: "#fca5a5", fontSize: 13 }}>
            {erro}
          </div>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────── */
function Dashboard({ data, fileName, onReset }) {
  const { empresa, cnpj, periodo, grupos } = data;

  const somaGrupo = (gid) => (grupos[gid] || []).reduce((s, i) => s + i.valor, 0);
  const totalEnt = ORDEM_ENTRADAS.reduce((s, gid) => s + somaGrupo(gid), 0);
  const totalSai = ORDEM_SAIDAS.reduce((s, gid) => s + somaGrupo(gid), 0);
  const diff     = totalEnt - totalSai;

  const kpis = [
    { label: "Total Entradas",           value: totalEnt,                                                             color: "#1d4ed8", bg: "#eff6ff" },
    { label: "Compras + Transf + Bonif", value: somaGrupo("compras_merc") + somaGrupo("transf_ent") + somaGrupo("bonus"), color: "#6d28d9", bg: "#faf5ff" },
    { label: "Materia-Prima / Prod Rural", value: somaGrupo("materia_prima"),                                          color: "#92400e", bg: "#fffbeb" },
    { label: "Total Vendas",             value: somaGrupo("vendas"),                                                  color: "#b91c1c", bg: "#fef2f2" },
    { label: "Total Saidas",             value: totalSai,                                                             color: "#0f172a", bg: "#f8fafc" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f1f5f9", minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        <div style={{ background: "#0f172a", borderRadius: 12, padding: "18px 24px", marginBottom: 18, color: "#fff",
                      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
              Resumo por Acumulador
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{empresa || fileName}</div>
            {(cnpj || periodo) && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                {cnpj && `CNPJ ${cnpj}`}{cnpj && periodo && " · "}{periodo && `Periodo: ${periodo}`}
              </div>
            )}
          </div>
          <button onClick={onReset}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid #334155", borderRadius: 8,
                     color: "#94a3b8", fontSize: 12, padding: "7px 14px", cursor: "pointer" }}>
            Nova planilha
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: k.bg, border: `1.5px solid ${k.color}22`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 700,
                            letterSpacing: "0.05em", marginBottom: 5, lineHeight: 1.4 }}>{k.label}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: k.color }}>{fmt(k.value)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              ENTRADAS
            </span>
            <span style={{ fontWeight: 800, color: "#1d4ed8", fontSize: 15 }}>{fmt(totalEnt)}</span>
          </div>
          {ORDEM_ENTRADAS.filter(gid => (grupos[gid] || []).length > 0).map(gid => (
            <SectionCard key={gid} gid={gid} items={grupos[gid]} defaultOpen={gid === "compras_merc"} />
          ))}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ background: "#b91c1c", color: "#fff", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              SAIDAS
            </span>
            <span style={{ fontWeight: 800, color: "#b91c1c", fontSize: 15 }}>{fmt(totalSai)}</span>
          </div>
          {ORDEM_SAIDAS.filter(gid => (grupos[gid] || []).length > 0).map(gid => (
            <SectionCard key={gid} gid={gid} items={grupos[gid]} defaultOpen={gid === "vendas"} />
          ))}
        </div>

        <div style={{ marginTop: 18, background: "#0f172a", borderRadius: 10, padding: "14px 20px",
                      display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>DIFERENCA (ENTRADAS - SAIDAS)</span>
          <span style={{ color: diff >= 0 ? "#4ade80" : "#f87171", fontSize: 18, fontWeight: 900 }}>{fmt(diff)}</span>
        </div>

      </div>
    </div>
  );
}

/* ─── App ─────────────────────────────────────────────────────── */
export default function App() {
  const [result,   setResult]   = useState(null);
  const [fileName, setFileName] = useState("");

  if (result) return <Dashboard data={result} fileName={fileName} onReset={() => { setResult(null); setFileName(""); }} />;
  return <UploadScreen onData={(data, name) => { setResult(data); setFileName(name); }} />;
}
