import {memo} from 'react';

import {
  ConstructionStep,
  EndStep,
  HeatMixtureStep,
  HeatStep,
  MixStep,
  SimpleInteractionStep,
  StartStep,
} from '../types';

import {useGameData} from './context';
import {RawSprite} from './sprites';
import {ReagentIngredient, RecipeIngredients, SolidIngredient} from './recipe-ingredients';
import {Temperature} from './temperature';

export interface RecipeInstructionsProps {
  steps: readonly ConstructionStep[];
  visible: boolean;
}

export const RecipeInstructions = memo((
  props: RecipeInstructionsProps
): JSX.Element => {
  const {visible, steps} = props;
  return (
    <ol className='recipe_instructions'>
      {steps.map((step, i) =>
        <Step key={i} step={step} visible={visible}/>
      )}
    </ol>
  );
});

interface StepProps {
  step: ConstructionStep;
  visible: boolean;
}

const Step = (props: StepProps): JSX.Element => {
  const {step, visible} = props;
  switch (step.type) {
    case 'start':
      return <StartStep step={step}/>;
    case 'end':
      return <EndStep step={step}/>;
    case 'mix':
      return <MixStep step={step} visible={visible}/>;
    case 'add':
      return <li className='recipe_step'>TODO</li>;
    case 'heat':
      return <HeatStep step={step}/>;
    case 'heatMixture':
      return <HeatMixtureStep step={step}/>;
    case 'cut':
    case 'roll':
    case 'stir':
    case 'shake':
      return <SimpleStep step={step}/>;
  }
};

interface StartStepProps {
  step: StartStep;
}

const StartStep = (props: StartStepProps): JSX.Element => {
  const {step} = props;
  return (
    <li className='recipe_step recipe_step--start'>
      Take <SolidIngredient id={step.entity} qty={1}/>
    </li>
  );
};

interface EndStepProps {
  step: EndStep;
}

const EndStep = (props: EndStepProps): JSX.Element => {
  const {step} = props;
  return (
    <li className='recipe_step recipe_step--end'>
      Finish with <SolidIngredient id={step.entity} qty={1}/>
    </li>
  );
};

interface MixStepProps {
  step: MixStep;
  visible: boolean;
}

const MixStep = (props: MixStepProps): JSX.Element => {
  const {step, visible} = props;

  // Slightly more compact view if there's only one ingredient.
  // I really wish JS had a better way of traversing objects.
  const keys = Object.keys(step.reagents);
  if (keys.length === 1) {
    const id = keys[0];
    const ingredient = step.reagents[id];
    return (
      <li className='recipe_step recipe_step--start'>
        {'Take '}
        <ReagentIngredient
          id={id}
          amount={ingredient.amount}
          catalyst={ingredient.catalyst}
        />
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--mix'>
        <div>Mix:</div>
        <RecipeIngredients
          visible={visible}
          reagents={step.reagents}
          solids={{}}
        />
      </li>
    );
  }
};

interface HeatStepProps {
  step: HeatStep;
}

const HeatStep = (props: HeatStepProps): JSX.Element => {
  const {step} = props;

  const {methodSprites} = useGameData();

  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites.heat!} alt=''/>
      Heat it to <Temperature k={step.minTemp}/>
    </li>
  );
};

interface HeatMixtureStepProps {
  step: HeatMixtureStep;
}

const HeatMixtureStep = (props: HeatMixtureStepProps): JSX.Element => {
  const {step} = props;

  const {methodSprites} = useGameData();

  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites.heatMixture!} alt=''/>
      {' '}
      {step.maxTemp != null ? <>
        Heat it to between <Temperature k={step.minTemp}/> and <Temperature k={step.maxTemp}/>
      </> : <>
        Heat it to <Temperature k={step.minTemp}/>
      </>}
    </li>
  );
};

interface SimpleStepProps {
  step: SimpleInteractionStep;
}

const SimpleStep = (props: SimpleStepProps): JSX.Element => {
  const {step} = props;

  const {methodSprites} = useGameData();

  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites[step.type]!} alt=''/>
      {SimpleStepText[step.type]}
    </li>
  );
};

const SimpleStepText: Readonly<Record<SimpleInteractionStep['type'], string>> = {
  cut: 'Cut it',
  roll: 'Roll it',
  shake: 'Shake it',
  stir: 'Stir it',
};
