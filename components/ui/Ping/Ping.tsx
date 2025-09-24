type PingProps = {
  content: string;
};

const Ping = ({ content }: PingProps) => {
  return (
    <div className="flex flex-row justify-center items-center gap-2">
      {content}
      <span className="relative flex size-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lightGreen opacity-75"></span>
        <span className="relative inline-flex size-3 rounded-full bg-lightGreen"></span>
      </span>
    </div>
  );
};

export default Ping;
