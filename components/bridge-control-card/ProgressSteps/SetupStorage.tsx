import Ping from "@/components/ui/Ping/Ping.tsx";

type SetupStorageProps = {
  subtitle: string;
};

const SetupStorage = ({ subtitle }: SetupStorageProps) => {
  return (
    //TOD button when user rejects setup transaction
    <div className="my-4">
      <Ping content={subtitle} />

    </div>
  );
};

export default SetupStorage;
