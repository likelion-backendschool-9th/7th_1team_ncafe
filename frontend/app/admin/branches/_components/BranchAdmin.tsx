"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import AdminToast, { useToast } from "../../_components/AdminToast";
import styles from "../../_components/admin.module.css";
import local from "./branches.module.css";
import { ApiError, getAdminSession, getBranches, saveBranch, validateBranch, type Branch, type BranchInput } from "../_lib/branchService";

const emptyInput = (): BranchInput => ({ id: "", name: "", address: "", sections: "[]", fixtures: "[]", open: false });

export default function BranchAdmin() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [admin, setAdmin] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [input, setInput] = useState<BranchInput>(emptyInput);
  const [errors, setErrors] = useState<ReturnType<typeof validateBranch>>({});
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const sequence = useRef(0);
  const formRef = useRef<HTMLElement>(null);
  const { toast, show } = useToast();

  const reload = useCallback(() => {
    const current = ++sequence.current;
    return Promise.all([getBranches(), getAdminSession()]).then(([list, isAdmin]) => {
      if (current !== sequence.current) return;
      setBranches(list);
      setAdmin(isAdmin);
    }).catch((error: unknown) => {
      if (current === sequence.current) {
        setAdmin(false);
        setLoadError(error instanceof Error ? error.message : "지점을 불러오지 못했습니다.");
      }
    }).finally(() => {
      if (current === sequence.current) setLoading(false);
    });
  }, []);

  useEffect(() => {
    const requestSequence = sequence;
    void reload();
    return () => { requestSequence.current++; };
  }, [reload]);

  function openForm(branch?: Branch) {
    setEditing({ id: branch?.id ?? null });
    setInput(branch ? { ...branch, sections: branch.sections ?? "[]", fixtures: branch.fixtures ?? "[]" } : emptyInput());
    setErrors({});
    setSaveError("");
    // 폼은 목록 아래에 있으므로 모바일에서도 바로 찾을 수 있게 이동한다.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector<HTMLInputElement>(branch ? "#branch-name" : "#branch-id")?.focus({ preventScroll: true });
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || saving.current || !admin) return;
    const nextErrors = validateBranch(input);
    setErrors(nextErrors);
    setSaveError("");
    if (Object.keys(nextErrors).length) return;
    saving.current = true;
    setBusy(true);
    try {
      const saved = await saveBranch({ ...input, id: input.id.trim(), name: input.name.trim(), address: input.address.trim() }, editing.id);
      setBranches((previous) => [...previous.filter((branch) => branch.id !== saved.id), saved]
        .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      setEditing(null);
      show(`"${saved.name}" 지점을 ${editing.id === null ? "등록" : "수정"}했습니다.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "저장하지 못했습니다.");
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) setAdmin(false);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const normalized = query.trim().toLowerCase();
  const filtered = branches.filter((branch) =>
    (status === "ALL" || branch.open === (status === "OPEN")) &&
    [branch.id, branch.name, branch.address].some((value) => value.toLowerCase().includes(normalized)));

  return <>
    <header className={styles.pageHead}>
      <div><span className="eyebrow">Branch Management</span><h1 className={styles.pageTitle}>지점 관리</h1>
        <p className="subtitle">전체 {branches.length}개 · 영업 중 {branches.filter((branch) => branch.open).length}개</p></div>
      <button type="button" className="btn btn-gold" disabled={!admin || loading || busy} onClick={() => openForm()}>+ 지점 등록</button>
    </header>
    <p className={local.notice}>지점 정보는 서버에 저장됩니다. 현재 H2 메모리 환경에서는 백엔드를 재시작하면 초기화됩니다.</p>
    {!loading && !loadError && !admin && <p role="status" className={local.notice}>등록·수정하려면 관리자 로그인이 필요합니다. 로그인 후 목록을 새로고침해 주세요.</p>}
    <div className={styles.toolbar} role="search">
      <label className={styles.toolField}><span className={styles.label}>지점 검색</span>
        <input type="search" className={styles.input} placeholder="지점 ID, 이름 또는 주소" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className={styles.toolField}><span className={styles.label}>영업 상태</span>
        <select className={styles.input} aria-label="영업 상태" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">전체</option><option value="OPEN">영업 중</option><option value="CLOSED">영업 종료</option>
        </select></label>
      <button type="button" className="btn" disabled={loading || busy} onClick={() => { setLoading(true); setLoadError(""); void reload(); }}>목록 새로고침</button>
    </div>
    {loading ? <p className={styles.note} role="status">지점을 불러오는 중입니다…</p>
      : loadError ? <p className={styles.formAlert} role="alert">{loadError}</p>
      : <><p className={styles.resultCount}>{filtered.length}개 지점</p>
        {filtered.length === 0 ? <div className={styles.empty}>{branches.length ? "검색 조건에 맞는 지점이 없습니다." : "등록된 지점이 없습니다."}</div>
          : <table className={`${styles.table} ${local.branchTable}`}><caption className="visually-hidden">지점 목록</caption>
            <thead><tr><th scope="col">지점 ID</th><th scope="col">지점명</th><th scope="col">주소</th><th scope="col">영업 상태</th><th scope="col">관리</th></tr></thead>
            <tbody>{filtered.map((branch) => <tr key={branch.id}>
              <td data-label="지점 ID">{branch.id}</td><td data-label="지점명"><strong>{branch.name}</strong></td>
              <td data-label="주소" className={local.address}>{branch.address}</td><td data-label="영업 상태">{branch.open ? "영업 중" : "영업 종료"}</td>
              <td className={styles.cellActions}><button type="button" className="btn" disabled={!admin || busy} aria-label={`${branch.name} 수정`} onClick={() => openForm(branch)}>수정</button></td>
            </tr>)}</tbody></table>}
      </>}
    {editing && <section ref={formRef} className={local.editor} aria-labelledby="branch-form-title">
      <h2 id="branch-form-title" className={styles.dialogTitle}>{editing.id === null ? "지점 등록" : "지점 수정"}</h2>
      {editing.id !== null && <p className={styles.hint}>지점 ID와 등록일은 변경되지 않습니다.</p>}
      <form className={styles.form} onSubmit={submit} noValidate>
        {saveError && <p className={styles.formAlert} role="alert">{saveError}</p>}
        <fieldset disabled={busy || !admin} className={local.fieldset}>
          <div className={styles.formGrid}>
            {([ ["id", "지점 ID", 255], ["name", "지점명", 100], ["address", "주소", 255] ] as const).map(([key, label, max]) =>
              <label className={`${styles.field} ${key === "address" ? styles.fieldWide : ""}`} key={key} htmlFor={`branch-${key}`}>
                <span className={styles.label}>{label}<span className={styles.required}>*</span></span>
                <input id={`branch-${key}`} className={styles.input} value={input[key]} maxLength={max} required
                  readOnly={key === "id" && editing.id !== null} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `branch-${key}-error` : undefined}
                  onChange={(event) => setInput({ ...input, [key]: event.target.value })} />
                {errors[key] && <span id={`branch-${key}-error`} className={styles.error}>{errors[key]}</span>}
              </label>)}
          </div>
          <label className={styles.checkLine}><input type="checkbox" checked={input.open} onChange={(event) => setInput({ ...input, open: event.target.checked })} />영업 중</label>
          <details className={local.floorPlan} open={!!errors.sections || !!errors.fixtures || undefined}>
            <summary>평면도 데이터 (선택)</summary>
            <p className={styles.hint}>평면도 구역과 고정 시설 정보를 JSON 배열로 입력합니다. 기존 지점 수정 시 저장된 값을 유지합니다.</p>
            {([ ["sections", "구역 정보"], ["fixtures", "고정 시설 정보"] ] as const).map(([key, label]) =>
              <label key={key} className={styles.field} htmlFor={`branch-${key}`}><span className={styles.label}>{label}</span>
                <textarea id={`branch-${key}`} className={`${styles.input} ${styles.textarea} ${styles.pathInput}`} rows={4} value={input[key]}
                  aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `branch-${key}-error` : undefined}
                  onChange={(event) => setInput({ ...input, [key]: event.target.value })} />
                {errors[key] && <span id={`branch-${key}-error`} className={styles.error}>{errors[key]}</span>}
              </label>)}
          </details>
        </fieldset>
        <div className={styles.dialogActions}>
          <button type="button" className="btn" disabled={busy} onClick={() => setEditing(null)}>취소</button>
          <button type="submit" className="btn btn-gold" disabled={busy || !admin}>{busy ? "저장 중…" : "저장"}</button>
        </div>
      </form>
    </section>}
    <AdminToast toast={toast} />
  </>;
}
