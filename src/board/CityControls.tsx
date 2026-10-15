import { useId, type SyntheticEvent } from 'react';
import { cityControlsModel, CONTROL_CITY_LABELS, type CityControlsState, type ControlCityType } from './cityControlsModel';
import './cityControls.css';

export interface CityControlsProps extends CityControlsState {
  onConvert: (type: ControlCityType) => void;
  onFly: () => void;
  onCancel: () => void;
  onClose: () => void;
}
/** One-row content for the permanently reserved city-action strip.
 * Parent owns Escape, focus restoration and lifecycle clearing.
 */
export function CityControls(props: CityControlsProps) {
  const id = useId();
  const model = cityControlsModel(props);
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  const status = props.targeting
    ? props.targeting === 'fly' ? 'Tap any other city to fly · Cancel or Escape to exit' : 'Choose a city for ground dispatch · Cancel or Escape to exit'
    : props.cityType === 'production' ? '' : `${model.planeText}${props.detail ? ` · ${props.detail}` : ''}`;
  return <section className="city-controls" aria-label="Selected city controls"
    aria-description={`${props.name}, ${CONTROL_CITY_LABELS[props.cityType]}, ${props.troops} garrison troops`}
    onPointerDown={stop} onPointerUp={stop} onClick={stop}>
    <div className="city-controls__types" role="group" aria-label="Convert city">
      {model.types.map(type => <button key={type.type} type="button" aria-pressed={type.current}
        disabled={type.disabled} aria-describedby={`${id}-${type.type}${type.current && props.cityType !== 'production' ? ` ${id}-plane` : ''}`}
        title={type.current && status ? status : type.reason || `Convert for ${type.cost} troops; leave 1 behind.`}
        onClick={() => { if (!type.disabled) props.onConvert(type.type); }}>
        <span>{type.label}</span><small>{type.current ? model.currentText : `${type.cost} troops`}</small>
      </button>)}
    </div>
    {props.targeting ? <button type="button" className="city-controls__action" onClick={props.onCancel}>Cancel</button>
      : props.cityType === 'airfield' && <button type="button" className="city-controls__action city-controls__fly"
        disabled={model.flyDisabled} aria-describedby={`${id}-fly ${id}-plane`} onClick={props.onFly}>Fly</button>}
    <button type="button" className="city-controls__action city-controls__close" aria-label="Close city controls" onClick={props.onClose}>×</button>
    {model.types.map(type => <span className="city-controls__sr" id={`${id}-${type.type}`} key={type.type}>
      {type.reason || `Convert to ${type.label} for ${type.cost} troops; leave 1 behind.`}
    </span>)}
    <p className="city-controls__sr">{model.reason}</p>
    <span className="city-controls__sr" id={`${id}-plane`} role={props.targeting ? 'status' : undefined}>{status}</span>
    <span className="city-controls__sr" id={`${id}-fly`}>{model.flyReason}</span>
  </section>;
}
