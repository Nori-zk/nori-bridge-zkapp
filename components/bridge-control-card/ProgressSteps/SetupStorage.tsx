import Ping from "@/components/ui/Ping/Ping.tsx";

type SetupStorageProps = {
  subtitle: string;
};

const SetupStorage = ({ subtitle }: SetupStorageProps) => {
  return (
    //TODO add retry button when user rejects setup transaction
    <Ping content={subtitle} />
  );
};

export default SetupStorage;
