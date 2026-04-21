"use client";

interface Props {
  message: string;
}

export default function ErrorBanner({ message }: Props) {
  return (
    <div
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        color: "#dc2626",
        marginBottom: 16,
      }}
    >
      {message}
    </div>
  );
}
