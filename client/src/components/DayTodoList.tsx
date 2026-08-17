import { useState } from "react";
import type { TodoItem } from "../types";
import { IconChevronRight, IconClose } from "./Icons";

type Props = {
  todos: TodoItem[];
  onAdd: (text: string) => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
};

export default function DayTodoList({ todos, onAdd, onToggle, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  }

  return (
    <div className="card day-todo-card">
      <button className="card-header" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">To-do list</span>
        <span className="task-pill">{todos.length}</span>
      </button>

      {expanded && (
        <div className="card-body">
          {todos.length === 0 ? (
            <p className="empty-hint">No to-dos yet for this day.</p>
          ) : (
            <ul className="task-list">
              {todos.map((todo) => (
                <li key={todo.id} className={`task-item ${todo.done ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={(e) => onToggle(todo.id, e.target.checked)}
                  />
                  <span className="task-name">{todo.text}</span>
                  <button className="icon-btn" title="Remove to-do" onClick={() => onDelete(todo.id)}>
                    <IconClose />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className="day-todo-add-form" onSubmit={submit}>
            <input
              type="text"
              placeholder="Add a to-do…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn small" type="submit">Add</button>
          </form>
        </div>
      )}
    </div>
  );
}
