import ChooseSide from "./ChooseSide.tsx";

const ChooseSides = () => {
  return (
    <div className="flex h-full grid grid-cols-3">
      <ChooseSide side={"red"} />
      <ChooseSide side={"blue"} />
      <ChooseSide side={"green"} />
    </div>
  );
};

export default ChooseSides;
