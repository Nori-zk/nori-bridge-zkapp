type NotificationProps = {
  content?: string;
  status?: "success" | "error" | "info"; // not yet implemented, for dynamic styling
};

const Notification = ({ content }: NotificationProps) => {
  return (
    <div className="rounded-tr-xl rounded-tl-xl mb-3 px-8 fixed left-1/2 -translate-x-1/2 z-50 bg-green-900 ">
      <div className="bottom-6 py-2 text-lightGreen">{content}</div>
    </div>
  );
};

export default Notification;
