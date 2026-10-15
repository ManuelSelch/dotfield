import { useId, type SyntheticEvent } from 'react';
import { cityControlsModel, CONTROL_CITY_LABELS, type CityControlsState, type ControlCityType } from './cityControlsModel';
import './cityControls.css';

export interface CityControlsProps extends CityControlsState {
  onConvert: (type: ControlCityType) => void;
  onFly: () => void;
  onCancel: () => void;
  onClose: () => void;
}
/** Selected content for the permanently reserved city-action strip.
 * Parent owns Escape, focus restoration and lifecycle clearing.
 */
export function CityControls(props: CityControlsProps) {
  const id = useId();
  const model = cityControlsModel(props);
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  return <section className="city-controls" aria-label="Selected city controls"
    onPointerDown={stop} onPointerUp={stop} onClick={stop}>
    <div className="city-controls__selection">
      <div><strong>{props.name} · {CONTROL_CITY_LABELS[props.cityType]}</strong>
        <span>{props.troops} garrison troops · {props.cityType === 'production' ? 'Troop growth' : 'No troop growth'}</span></div>
      <button type="button" className="city-controls__close" aria-label="Close city controls" onClick={props.onClose}>×</button>
    </div>
    <div className="city-controls__types" role="group" aria-label="Convert city">
      {model.types.map(type => <button key={type.type} type="button" aria-pressed={type.current}
        disabled={type.disabled} aria-describedby={`${id}-${type.type}`} onClick={() => {
          if (!type.disabled) props.onConvert(type.type);
        }}>
        <span>{type.label}</span><small>{type.current ? 'Current · no charge' : `${type.cost} troops`}</small>
      </button>)}
    </div>
    {model.types.map(type => <span className="city-controls__sr" id={`${id}-${type.type}`} key={type.type}>
      {type.reason || `Convert to ${type.label} for ${type.cost} troops; leave 1 behind.`}
    </span>)}
    <p className="city-controls__sr">{model.reason}</p>
    <div className="city-controls__flight">
      <span id={`${id}-plane`} role={props.targeting ? 'status' : undefined}>{props.targeting
        ? props.targeting === 'fly' ? 'Tap any other city to fly · Cancel or Escape to exit' : 'Choose a city for ground dispatch · Cancel or Escape to exit'
        : `${model.planeText}${props.detail ? ` · ${props.detail}` : ''}`}</span>
      {props.targeting ? <button type="button" onClick={props.onCancel}>Cancel</button> : <>
        {props.cityType === 'airfield' && <button type="button" className="city-controls__fly"
          disabled={model.flyDisabled} aria-describedby={`${id}-fly ${id}-plane`} onClick={props.onFly}>Fly</button>}
      </>}
    </div>
    <span className="city-controls__sr" id={`${id}-fly`}>{model.flyReason}</span>
  </section>;
}
