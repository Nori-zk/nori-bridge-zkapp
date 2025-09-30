import { FaXmark } from "react-icons/fa6";
import ChooseSide from "./ChooseSide.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useState } from "react";

const ChooseSides = () => {
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const { setShowChooseSide } = useProgress();
  const { reset } = useNoriBridge();

  const handleClose = () => {
    console.log("Close button clicked");
    reset();
    setShowChooseSide(false);
  };
  return (
    <div className="h-full relative w-full">
      <div className="absolute right-0 top-0 z-20 p-6 text-white">
        <FaXmark onClick={handleClose} size={34} />
      </div>
      <div className="flex h-full grid grid-cols-3">
        <ChooseSide
          isDisabled={isDisabled}
          setIsDisabled={setIsDisabled}
          side={"red"}
        />
        <ChooseSide
          isDisabled={isDisabled}
          setIsDisabled={setIsDisabled}
          side={"blue"}
        />
        <ChooseSide
          isDisabled={isDisabled}
          setIsDisabled={setIsDisabled}
          side={"green"}
        />
      </div>
    </div>
  );
};

export default ChooseSides;
