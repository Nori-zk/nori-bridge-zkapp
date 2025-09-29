import ChooseSide from "./ChooseSide.tsx";

const ChooseSides = () => {
  const blueText = "Rising from the chaos of the Great Collapse, the Kageyama Syndicate is a cybernetic Yakuza clan guided by a philosophy of absolute control. They view chaos and freedom as bugs to be fixed and seek to subjugate all other factions, not to destroy them, but to integrate their assets into a single, perfectly efficient, and profitable hierarchy under their command.";
  const greenText = "Vindicated by the Great Collapse, the Cypherpunks are a leaderless collective of hackers who believe code is the only just law. They fight all forms of centralized authority to build a new reality that guarantees absolute individual freedom. Their world would be governed not by rulers, but by transparent, verifiable algorithms that place power directly in the hands of the people.";
  const redText = "The Yokai are ancient spirits, violently cast into our world during the cataclysm they call the Sundering. They consider all digital technology an unnatural 'corruption' that poisons their magic and sickens their very being. Their sole purpose is to purge this technological blight and restore a world where the raw power of nature and tradition reigns supreme.";

  return (
    <div className="flex h-full grid grid-cols-3">
      <ChooseSide side={"red"} text={redText} />
      <ChooseSide side={"blue"} text={blueText} />
      <ChooseSide side={"green"} text={greenText} />
    </div>
  );
};

export default ChooseSides;
