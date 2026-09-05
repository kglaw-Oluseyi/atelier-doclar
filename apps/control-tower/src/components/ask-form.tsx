export function AskForm({ defaultQuestion }: { defaultQuestion: string }) {
  return (
    <form method="get" className="form" role="search">
      <label>
        Programme question
        <input name="q" defaultValue={defaultQuestion} required />
      </label>
      <button type="submit">Ask</button>
    </form>
  );
}
