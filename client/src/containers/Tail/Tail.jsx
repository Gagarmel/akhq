import React, { Component } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import _ from 'lodash';
import Input from '../../components/Form/Input';
import Header from '../Header';
import { get } from '../../utils/api';
import { uriTopics, uriLiveTail } from '../../utils/endpoints';
import Table from '../../components/Table';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-dracula';

const STATUS = {
  STOPPED: 'STOPPED',
  STARTED: 'STARTED',
  PAUSED: 'PAUSED'
};

const MAX_RECORDS = [50, 100, 250, 500, 1000, 2500];

class Tail extends Component {
  state = {
    search: '',
    dropdownSearch: '',
    topics: [],
    showDropdown: false,
    selectedTopics: [],
    selectedStatus: 'STOPPED',
    maxRecords: 50,
    data: [],
    showFilters: ''
  };
  eventSource;

  componentDidMount = async () => {
    const { clusterId } = this.props.match.params;
    let data = {};
    try {
      data = await get(uriTopics(clusterId, '', 'ALL', ''));
      data = data.data;
      if (data) {
        if (data.results) {
          this.setState({ topics: data.results });
        } else {
          this.setState({ topics: [] });
        }
      }
    } catch (err) {
      this.props.history.replace('/ui/error', { errorData: err });
    }
  };

  componentWillUnmount = () => {
    this.onStop();
  };

  startEventSource = () => {
    const { clusterId } = this.props.match.params;
    const { search, selectedTopics, maxRecords } = this.state;
    let topicsToCall = selectedTopics.map(topic => {
      return topic.name;
    });
    this.eventSource = new EventSource(
      uriLiveTail(clusterId, search, topicsToCall, JSON.stringify(maxRecords))
    );
    let self = this;
    this.eventSource.addEventListener('tailBody', function(e) {
      let res = JSON.parse(e.data);
      const { data } = self.state;
      if (res.records) {
        data.push(res.records[0]);
        self.setState({ data });
      }
    });

    this.eventSource.onerror = e => {
      this.props.history.replace({
        ...this.props.location,
        showErrorToast: true,
        errorToastMessage: 'There was an error while trying to connect to the live tail.',
        loading: false
      });
      this.setState({ selectedStatus: STATUS.STOPPED });
    };
  };

  onStop = () => {
    if (this.eventSource) this.eventSource.close();
  };

  onStart = () => {
    this.startEventSource();
  };

  handleChange = e => {
    this.setState({ [e.target.name]: [e.target.value] });
  };

  handleSelectedTopics = topic => {
    let selectedTopics = this.state.selectedTopics;
    if (
      selectedTopics.find(el => {
        return el.name === topic.name;
      })
    ) {
      let updatedSelected = _.remove(selectedTopics, el => {
        return el.name !== topic.name;
      });
      this.setState({
        selectedTopics: updatedSelected
      });
    } else {
      selectedTopics.push(topic);
      this.setState({ selectedTopics: selectedTopics });
    }
  };

  renderTopicList = () => {
    let { topics, dropdownSearch, selectedTopics } = this.state;

    return (
      <div style={{ maxHeight: '678px', overflowY: 'auto', minHeight: '89px' }}>
        <ul
          className="dropdown-menu inner show"
          role="presentation"
          style={{ marginTop: '0px', marginBottom: '0px' }}
        >
          {topics
            .filter(topic => {
              if (dropdownSearch.length > 0) {
                return topic.name.includes(dropdownSearch);
              }
              return topic;
            })
            .map((topic, index) => {
              let selected = selectedTopics.find(selected => selected.name === topic.name);
              return (
                <li>
                  <a
                    onClick={() => {
                      this.onStop();
                      this.setState({ data: [] });
                      this.handleSelectedTopics(topic);
                    }}
                    role="option"
                    className={`dropdown-item ${selected ? 'selected' : ''}`}
                    id={`bs-select-${index}-0`}
                    aria-selected="false"
                  >
                    <span className="fa fa-check check-mark"/>
                    <span className="text">{topic.name}</span>
                  </a>
                </li>
              );
            })}
        </ul>{' '}
      </div>
    );
  };

  openAndCloseFilters() {
    let { showFilters } = this.state;
    if (showFilters === 'show') {
      this.setState({ showFilters: '' });
    } else {
      this.setState({ showFilters: 'show' });
    }
  }

  render() {
    const {
      search,
      dropdownSearch,
      selectedTopics,
      topics,
      selectedStatus,
      maxRecords,
      data,
      showFilters
    } = this.state;
    return (
      <div>
        <Header title="Live Tail" history={this.props.history} />
        <nav
          className="navbar navbar-expand-lg navbar-light 
        bg-light mr-auto khq-data-filter khq-sticky khq-nav"
        >
          <button
              className="navbar-toggler"
              type="button"
              data-toggle="collapse"
              data-target="#navbar-search"
              aria-controls="navbar-search"
              aria-expanded="false"
              aria-label="Toggle navigation"
              onClick={() => {
                this.openAndCloseFilters();
              }}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`form-inline collapse navbar-collapse ${showFilters}`} id="navbar-search">
          <Input
            type="text"
            name="search"
            id="search"
            value={search}
            label={''}
            placeholder={'Search...'}
            onChange={e => {
              this.onStop();
              this.setState({ data: [] });
              this.handleChange(e);
            }}
            wrapperClass={'tail-search-wrapper'}
            inputClass={'tail-search-input'}
          />
          <Dropdown className="form-group dropdown bootstrap-select show-tick khq-select show">
            <Dropdown.Toggle className="btn dropdown-toggle btn-white">
              {selectedTopics.length === 0
                ? 'Topics'
                : selectedTopics.length === 1
                ? selectedTopics[0].name
                : `${selectedTopics.length} Topics Selected`}
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ maxHeight: '771px', overflow: 'hidden', minHeight: '182px' }}>
              <div className="bs-searchbox">
                <input
                  type="text"
                  name="dropdownSearch"
                  id="dropdownSearch"
                  className="form-control"
                  autoComplete="off"
                  role="combobox"
                  aria-label="Search"
                  aria-controls="bs-select-1"
                  aria-autocomplete="list"
                  placeholder={'search'}
                  onChange={this.handleChange}
                  value={dropdownSearch}
                />
              </div>
              <div className="bs-actionsbox">
                <div className="btn-group btn-group-sm btn-block">
                  <button
                    onClick={() => {
                      this.onStop();

                      this.setState({
                        data: [],
                        selectedTopics: JSON.parse(JSON.stringify(topics)).filter(topic => {
                          if (dropdownSearch.length > 0) {
                            return topic.name.includes(dropdownSearch);
                          }
                          return topic;
                        })
                      });
                    }}
                    type="button"
                    className="actions-btn bs-select-all btn btn-light"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => {
                      this.onStop();
                      this.setState({ data: [], selectedTopics: [] });
                    }}
                    type="button"
                    className="actions-btn bs-deselect-all btn btn-light"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              {this.renderTopicList()}
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown className="form-group dropdown bootstrap-select show-tick khq-select show">
            <Dropdown.Toggle className="btn dropdown-toggle btn-white">
              Max Records: {maxRecords}
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ maxHeight: '771px', overflow: 'hidden', minHeight: '182px' }}>
              {MAX_RECORDS.map(maxRecord => {
                return (
                  <li>
                    <a
                      onClick={() => {
                        this.onStop();
                        this.setState({ maxRecords: maxRecord, data: [] });
                      }}
                      role="option"
                      className="dropdown-item"
                      aria-selected="false"
                    >
                      {maxRecord}
                    </a>
                  </li>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>
          <button
            onClick={() => {
              this.onStop();
              this.setState({ selectedStatus: STATUS.STARTED }, () => {
                this.onStart();
              });
            }}
            className="btn btn-primary"
            type="submit"
          >
            <span className="d-md-none">Search </span>
            <i className="fa fa-search" />
          </button>
          <div className="btn-group actions" role="group">
            <button
              className={`btn btn-secondary pause ${
                selectedStatus === STATUS.STARTED ? '' : 'd-none'
              }`}
              onClick={() => {
                this.onStop();
                this.setState({ selectedStatus: STATUS.PAUSED });
              }}
            >
              <i className={'fa fa-pause'}/>
              <span> Pause</span>
            </button>
            <button
              className={`btn btn-secondary resume ${selectedStatus === STATUS.PAUSED ? '' : 'd-none'}`}
              onClick={() => {
                this.onStart();
                this.setState({ selectedStatus: STATUS.STARTED });
              }}
            >
              <i className="fa fa-play"/> <span> Resume</span>
            </button>
            <button
              className={`btn btn-secondary empty ${
                selectedStatus === STATUS.STARTED || selectedStatus === STATUS.PAUSED
                  ? ''
                  : 'd-none'
              }`}
              onClick={() => {
                this.setState({ data: [] });
              }}
            >
              <i className="fa fa-remove"/> <span> Clear</span>
            </button>
          </div>
          </div>
        </nav>
        {selectedStatus !== STATUS.STOPPED && (
          <Table
            columns={[
              {
                id: 'topic',
                accessor: 'topic',
                colName: 'Topic',
                type: 'text'
              },
              {
                id: 'key',
                accessor: 'key',
                colName: 'Key',
                type: 'text',
                cell: obj => {
                  return <span style={{ color: 'red' }}>{obj.key}</span>;
                }
              },
              {
                id: 'timestamp',
                accessor: 'timestamp',
                colName: 'Date',
                type: 'text'
              },
              {
                id: 'partition',
                accessor: 'partition',
                colName: 'Partition',
                type: 'text'
              },
              {
                id: 'offset',
                accessor: 'offset',
                colName: 'Offset',
                type: 'text'
              },
              {
                id: 'headers',
                accessor: 'headers',
                colName: 'Headers',
                type: 'text',
                expand: true,
                cell: obj => {
                  return <a className="tail-headers">{obj.headers? Object.keys(obj.headers).length: 0}</a>;
                }
              },
              {
                id: 'value',
                accessor: 'value',
                colName: 'Schema',
                type: 'text',
                extraRow: true,
                extraRowContent: (obj, index) => {
                  return (
                    <AceEditor
                      mode="json"
                      id={'value' + index}
                      theme="dracula"
                      value={obj.value}
                      readOnly
                      name="UNIQUE_ID_OF_DIV"
                      editorProps={{ $blockScrolling: true }}
                      style={{ width: '100%', minHeight: '25vh' }}
                    />
                  );
                },
                cell: (obj) => {
                  return (
                    <pre className="mb-0 khq-data-highlight">
                      <code>{obj.value}</code>
                    </pre>
                  );
                }
              }
            ]}
            extraRow
            noStripes
            data={data}
            noContent={<tr/>}
            onExpand={obj => {
              return Object.keys(obj.headers).map(header => {
                return (
                  <tr
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%'
                    }}
                  >
                    <td
                      style={{
                        width: '100%',
                        display: 'flex',
                        borderStyle: 'dashed',
                        borderWidth: '1px',
                        backgroundColor: '#171819'
                      }}
                    >
                      {header}
                    </td>
                    <td
                      style={{
                        width: '100%',
                        display: 'flex',
                        borderStyle: 'dashed',
                        borderWidth: '1px',
                        backgroundColor: '#171819'
                      }}
                    >
                      {obj.headers[header]}
                    </td>
                  </tr>
                );
              });
            }}
          />
        )}
      </div>
    );
  }
}

export default Tail;
