type NotificationProps = {
  content?: string;
  status?: "success" | "error" | "info"; // not yet implemented, for dynamic styling
  show?: boolean;
};

const Notification = ({ content, show = false }: NotificationProps) => {
  return (
    <div
      className={`rounded-tr-xl rounded-tl-xl mb-2 px-8 fixed left-1/2 -translate-x-1/2 z-50 bg-green-900 transition-all duration-500 ${
        show
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="py-2 text-lightGreen">{content}</div>
    </div>
  );
};

export default Notification;
