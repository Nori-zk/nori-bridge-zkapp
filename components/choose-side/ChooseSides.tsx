import ChooseSide from "./ChooseSide.tsx";

const ChooseSides = () => {
  return (
    <div className="flex h-full">
      <ChooseSide side={"red"} />
      <ChooseSide side={"blue"} />
      <ChooseSide side={"green"} />
    </div>
  );
};

export default ChooseSides;
