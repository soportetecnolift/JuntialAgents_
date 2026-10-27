import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../../lib/api.js';
import { Button, Field, Input, Textarea, Badge, Section, Empty, useToast } from '../../components/ui.jsx';
import { Plus, Trash2, ChevronDown, ShieldCheck, ShieldAlert, Sparkles, RefreshCw, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

const W = (bot) => `/bots/${bot._id}/worker`;

/** Una sección colapsable del guion, con ayuda contextual (el "por qué" de cada pregunta). */
function Block({ label, help, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-line">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="font-semibold">{label}</span>
        <ChevronDown size={18} className={`shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3 border-t border-line px-4 py-4">
        {help && <p className="flex gap-2 text-xs text-ink-soft"><HelpCircle size={14} className="mt-0.5 shrink-0" />{help}</p>}
        {children}
      </div>}
    </div>
  );
}

function DynamicList({ items, onChange, addLabel, renderRow, blank }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => renderRow(it, i, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), () => onChange(items.filter((_, j) => j !== i))))}
      <Button size="sm" variant="secondary" onClick={() => onChange([...items, blank])}><Plus size={14} />{addLabel}</Button>
    </div>
  );
}

const CompletenessBar = ({ score }) => (
  <div className="flex items-center gap-2">
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist"><div className={`h-full rounded-full ${score >= 80 ? 'bg-tide' : score >= 40 ? 'bg-signal' : 'bg-flare'}`} style={{ width: `${score}%` }} /></div>
    <span className="w-10 shrink-0 text-right text-sm font-semibold">{score}%</span>
  </div>
);

export function WorkerBlueprintTab({ bot, refetch }) {
  const toast = useToast();
  const q = useQuery({ queryKey: ['wk-blueprint', bot._id], queryFn: () => api.get(`${W(bot)}/blueprint`).then((r) => r.data) });
  const ob = useQuery({ queryKey: ['wk-onboarding', bot._id], queryFn: () => api.get(`${W(bot)}/onboarding`).then((r) => r.data) });
  const [bp, setBp] = useState(null); const [saving, setSaving] = useState(false); const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState(''); const [completeness, setCompleteness] = useState(null);
  useEffect(() => { if (q.data && !bp) { setBp(q.data.blueprint || {}); setPreview(q.data.preview || ''); setCompleteness(q.data.completeness || null); } }, [q.data]); // eslint-disable-line
  const set = (patch) => setBp({ ...bp, ...patch });

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put(`${W(bot)}/blueprint`, bp);
      setPreview(data.preview); setCompleteness(data.completeness);
      toast('Guion guardado: el manual se ha generado a partir de él'); refetch?.();
    } catch (e) { toast(errMsg(e), 'bad'); } finally { setSaving(false); }
  }
  async function runCheck() {
    setChecking(true);
    try { await ob.refetch(); const { data } = await api.post(`${W(bot)}/onboarding/check`); ob.refetch(); toast(data.skipped ? data.reason : 'Puesta a punto completada'); }
    catch (e) { toast(errMsg(e), 'bad'); } finally { setChecking(false); }
  }
  if (!bp) return <p className="text-ink-soft">Cargando…</p>;
  const o = ob.data;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Section title="El guion de configuración" description="En vez de escribir el manual de golpe, respóndelo sección por sección. Cada pregunta nace de un fallo real que hemos visto en producción con otros empleados: saltarte una suele significar un error evitable más adelante.">
          {completeness && <div className="mb-3"><CompletenessBar score={completeness.score} />
            {completeness.missing.length > 0 && <ul className="mt-2 space-y-1">{completeness.missing.map((m, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-signal"><ShieldAlert size={13} className="mt-0.5 shrink-0" />{m}</li>)}</ul>}
          </div>}

          <div className="space-y-3">
            <Block label="1 · Contexto del negocio" help="Quién es la empresa, en qué sistema trabaja (CRM, ERP…) y dónde empieza y termina su ámbito. Sin esto, el empleado no sabe qué datos son relevantes." defaultOpen>
              <Textarea rows={4} value={bp.context || ''} onChange={(e) => set({ context: e.target.value })} placeholder="Tecnolift vende e instala ascensores. Trabajas en Zoho CRM, módulo Tratos (Deals). Tu ámbito empieza cuando Stage = «6. Ganado» y termina en Estado_del_Montaje = «16 En Marcha»." />
            </Block>

            <Block label="2 · Variantes o familias a distinguir" help="Si tu proceso trata distinto según el tipo de producto, cliente o canal, decláralo aquí. Si no lo haces, el empleado aplicará la misma regla a todos los casos y fallará en las excepciones.">
              <DynamicList items={bp.variants || []} onChange={(v) => set({ variants: v })} addLabel="Añadir variante" blank={{ name: '', rule: '' }}
                renderRow={(it, i, patch, remove) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[1fr_2fr_auto]">
                    <Input placeholder="Nombre (p. ej. Fabricación propia)" value={it.name} onChange={(e) => patch({ name: e.target.value })} />
                    <Input placeholder="Regla propia para esta variante" value={it.rule} onChange={(e) => patch({ rule: e.target.value })} />
                    <button aria-label="Quitar" onClick={remove} className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button>
                  </div>
                )} />
            </Block>

            <Block label="3 · Fases del proceso y criterio para avanzar" help="El campo que marca la fase, TODOS sus valores reales (cualquier otro se tratará como anómalo), y qué debe estar completo en cada paso para proponer el avance.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Campo de estado/fase" hint="El nombre API exacto, no el nombre visible."><Input value={bp.stateField || ''} onChange={(e) => set({ stateField: e.target.value })} placeholder="Estado_del_Montaje" /></Field>
                <Field label="Regla de completitud" hint="Cuándo se considera listo para avanzar."><Input value={bp.completionRule || ''} onChange={(e) => set({ completionRule: e.target.value })} placeholder="completitud ≥90% → LISTO PARA AVANZAR" /></Field>
              </div>
              <Field label="Todos los valores reales del campo" hint="Sepáralos por comas. Esto evita que el empleado trate un valor válido como un error, o al revés."><Textarea rows={2} value={bp.allStateValues || ''} onChange={(e) => set({ allStateValues: e.target.value })} placeholder="01 Unidades Sin Pedir, 02 Solicitud Enviada, 04 En producción, 05 Fabricado, …, 16 En Marcha" /></Field>
              <p className="mt-1 text-xs font-semibold text-ink-soft">Pasos de la secuencia</p>
              <DynamicList items={bp.stages || []} onChange={(v) => set({ stages: v })} addLabel="Añadir paso" blank={{ from: '', to: '', requirement: '' }}
                renderRow={(it, i, patch, remove) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[1fr_1fr_2fr_auto]">
                    <Input placeholder="Desde" value={it.from} onChange={(e) => patch({ from: e.target.value })} />
                    <Input placeholder="Hasta" value={it.to} onChange={(e) => patch({ to: e.target.value })} />
                    <Input placeholder="Qué exigir para avanzar" value={it.requirement} onChange={(e) => patch({ requirement: e.target.value })} />
                    <button aria-label="Quitar" onClick={remove} className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button>
                  </div>
                )} />
            </Block>

            <Block label="4 · Automatizaciones que ya existen" help="Qué dispara el sistema solo al cambiar un campo (facturas, documentos, mensajes…). Sin esto, el empleado puede proponer duplicar a mano algo que ya se hace automáticamente.">
              <Textarea rows={3} value={bp.automations || ''} onChange={(e) => set({ automations: e.target.value })} placeholder="Cambiar Estado_del_Montaje dispara: facturas de hito en Books, carpeta en WorkDrive, mensaje en el grupo de Telegram del trato…" />
            </Block>

            <Block label="5 · Peculiaridades de los datos" help="Campos con nombre engañoso, ruido de una migración, o nombres API que hay que usar literalmente. Sin esto, el empleado puede «inventar» un nombre de campo razonable que en realidad no existe.">
              <Textarea rows={3} value={bp.dataQuirks || ''} onChange={(e) => set({ dataQuirks: e.target.value })} placeholder="No uses Modified_Time: está contaminado por una migración masiva del 9 de julio." />
            </Block>

            <Block label="6 · Qué puede hacer solo y qué requiere aprobación" help="Explica el PORQUÉ en lenguaje de negocio (p. ej. «cambiar el estado dispara facturación»), no solo la regla técnica de autonomía.">
              <Textarea rows={3} value={bp.autonomyNotes || ''} onChange={(e) => set({ autonomyNotes: e.target.value })} placeholder="Cambiar Estado_del_Montaje, Stage o fechas de previsión dispara facturas y mensajes automáticos: pide aprobación siempre, mostrando valor actual → propuesto y el motivo." />
              <p className="text-xs text-ink-soft">Los permisos reales (qué categorías de acción se auto-aprueban) se configuran en la pestaña <b>Autonomía</b>; esto es solo la explicación que leerá el empleado.</p>
            </Block>

            <Block label="7 · Cómo debe avisar" help="El formato exacto de cada aviso. Sin esto, los informes quedan en prosa libre difícil de escanear.">
              <Textarea rows={2} value={bp.reportFormat || ''} onChange={(e) => set({ reportFormat: e.target.value })} placeholder="[Nombre del trato] · Modelo · Fase actual · Qué pasa · Qué falta o qué propongo · A quién le toca. Agrupa por: HOY, ESTA SEMANA, DATOS." />
            </Block>

            <Block label="8 · Orden de prioridad">
              <DynamicList items={(bp.priorities || []).map((p) => ({ text: p }))} onChange={(v) => set({ priorities: v.map((x) => x.text) })} addLabel="Añadir prioridad" blank={{ text: '' }}
                renderRow={(it, i, patch, remove) => (
                  <div key={i} className="flex gap-2"><span className="grid h-10 w-7 shrink-0 place-items-center text-sm font-bold text-ink-soft">{i + 1}</span>
                    <Input value={it.text} onChange={(e) => patch({ text: e.target.value })} /><button aria-label="Quitar" onClick={remove} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button></div>
                )} />
            </Block>

            <Block label="9 · Cómo consultar los datos (técnico)" help="Patrones de consulta correctos para tu conector concreto. Si lo dejas en blanco, pulsa «Puesta a punto»: el empleado intentará descubrirlo solo contra el conector real y te lo rellenará.">
              <Textarea rows={3} value={bp.queryHints || ''} onChange={(e) => set({ queryHints: e.target.value })} placeholder="Usa ZohoCRM_searchRecords con criteria, no «filters». En getTasksRecords, envía siempre startDateTime y endDateTime." />
            </Block>

            <Block label="10 · Notas adicionales">
              <Textarea rows={3} value={bp.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Cualquier otra cosa que no encaje arriba." />
            </Block>
          </div>

          <div className="mt-4 flex justify-end"><Button onClick={save} loading={saving}>Guardar guion y generar manual</Button></div>
        </Section>
      </div>

      <div className="space-y-4">
        <Section title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-tide" />Puesta a punto</span>}
          description="Antes de dejarlo trabajar solo, comprueba contra el sistema REAL qué campos de este guion existen de verdad. Es exactamente el paso que nos habría ahorrado varias correcciones en producción con otros empleados.">
          <Button className="w-full" variant="secondary" onClick={runCheck} loading={checking}><RefreshCw size={15} />{o ? 'Repetir comprobación' : 'Comprobar ahora'}</Button>
          {o?.skipped && <p className="mt-3 text-sm text-signal">{o.reason}</p>}
          {o && !o.skipped && (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-ink-soft">{o.summary}</p>
              {o.confirmed?.length > 0 && <div><p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tide-dark"><CheckCircle2 size={14} />Confirmados</p>
                <ul className="space-y-1">{o.confirmed.map((c, i) => <li key={i}><code className="rounded bg-mist px-1 text-xs">{c.field}</code> {c.note && <span className="text-xs text-ink-soft">— {c.note}</span>}</li>)}</ul></div>}
              {o.notFound?.length > 0 && <div><p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-flare"><XCircle size={14} />No encontrados</p>
                <ul className="space-y-1">{o.notFound.map((c, i) => <li key={i}><code className="rounded bg-flare-tint px-1 text-xs">{c.field}</code>{c.suggestion && <span className="text-xs text-ink-soft"> — ¿quizás «{c.suggestion}»?</span>}</li>)}</ul></div>}
              {o.stateValuesNotFound?.length > 0 && <p className="text-xs text-flare">Valores de estado declarados que no aparecen en el sistema: {o.stateValuesNotFound.join(', ')}</p>}
              {o.extraStateValues?.length > 0 && <p className="text-xs text-signal">Valores que existen en el sistema y no están en tu lista: {o.extraStateValues.join(', ')}</p>}
              {!o.notFound?.length && !o.stateValuesNotFound?.length && <p className="flex items-center gap-1.5 text-xs font-semibold text-tide-dark"><ShieldCheck size={14} />Todo lo comprobado existe. El empleado puede trabajar con confianza sobre estos campos.</p>}
              <p className="text-xs text-ink-soft">Comprobado {new Date(o.checkedAt).toLocaleString('es-ES')}.</p>
            </div>
          )}
          {!o && !ob.isLoading && <p className="mt-3 text-sm text-ink-soft">Aún no se ha comprobado nada.</p>}
        </Section>

        <Section title="Vista previa del manual" description="Esto es exactamente lo que leerá el empleado antes de cada tarea.">
          {preview ? <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-mist p-3 font-mono text-xs leading-relaxed">{preview}</pre> : <Empty title="Guion vacío">Rellena las secciones de la izquierda para generar el manual.</Empty>}
        </Section>
      </div>
    </div>
  );
}
