import NetworkSelectCardContent from "@/components/network-select-card/NetworkSelectCardContent/NetworkSelectCardContent.tsx";

type NetworkSelectCardProps = {
  onClose: () => void;
};

const NetworkSelectCard = ({ onClose }: NetworkSelectCardProps) => {
  return <NetworkSelectCardContent onClose={onClose} />;
};

export default NetworkSelectCard;
